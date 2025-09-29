/**
 * 
 * CREATE TASK:
 * - Single tasks: Create one task without recurrence
 * - Recurring tasks: Create a Series and generate all task occurrences based on recurrence pattern
 * 
 * UPDATE TASK:
 * - 'single' mode: Update only the specific task instance
 * - 'all' mode: Update all tasks in the recurring series
 * - 'following' mode: Split the series and update this task and all following occurrences
 * - Converting to recurring: If a non-recurring task receives a recurrence object, 
 *   it will be converted to a recurring series regardless of update mode
 * 
 * DELETE TASK:
 * - 'single' mode: Delete only the specific task instance
 * - 'all' mode: Delete all tasks in the series and the series itself
 * - 'following' mode: Delete this task and all following occurrences
 * 
 * SERIES MANAGEMENT:
 * - Series splitting for "this and following" operations
 * - Automatic series cleanup when no tasks remain
 * - Series metadata tracking (first/last occurrence times)
 * 
 * Usage Examples:
 * 
 * Create recurring task:
 * POST /tasks
 * {
 *   "title": "Daily Standup",
 *   "isRecurring": true,
 *   "recurrence": {
 *     "frequency": "daily",
 *     "interval": 1,
 *     "count": 30
 *   },
 *   "startTime": 1640995200000
 * }
 * 
 * Update all tasks in series:
 * PUT /tasks/:id?updateMode=all
 * { "title": "Updated Daily Standup" }
 * 
 * Update this and following tasks:
 * PUT /tasks/:id?updateMode=following
 * { "title": "New Meeting Format" }
 * 
 * Delete all tasks in series:
 * DELETE /tasks/:id?deleteMode=all
 * 
 * Convert non-recurring task to recurring:
 * PUT /tasks/:id
 * {
 *   "title": "Updated Task",
 *   "recurrence": {
 *     "frequency": "weekly",
 *     "interval": 1,
 *     "count": 10
 *   }
 * }
 */

const Task = require('../models/task');
const Series = require('../models/series');
const { getCurrentUser } = require('../middleware/firebaseAuth');
const { generateOccurrences, compareTwoRecurrence } = require('../utils/recurrenceUtils');
const mongoose = require('mongoose');
const { DateTime } = require('luxon');

// Create a new task
exports.createTask = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();

		const payload = { ...req.body };

		// If no recurrence provided, create a single task (existing behavior)
		if (!payload.isRecurring || !payload.recurrence) {
			const task = new Task({
				...payload,
				userId: user._id,
				isRecurring: false
			});
			await task.save();
			return res.status(201).json(task);
		}

		// Recurring: create a Series and materialize tasks
		const {
			title,
			description,
			status,
			startTime,
			endTime,
			dueTime,
			priority,
			type,
			recurrence,
			goalId,
			tagIds,
			note,
			isBacklog,
			skipped,
			planPeriod,
		} = payload;

		// Create the series record
		const series = new Series({
			title: title || 'for recurring',
			description,
			recurrence,
			userId: user._id,
			goalId,
			tagIds: tagIds,
			priority: priority || 1,
			color: '#8B5CF6'
		});
		await series.save();

		// Generate occurrences based on recurrence
		const occurrences = generateOccurrences({
			startTime,
			recurrence
		});

		// Create task template
		const taskTemplate = {
			title,
			description,
			status: status || 'todo',
			startTime,
			endTime,
			dueTime,
			priority: priority || 1,
			type: type || 'task',
			userId: user._id,
			goalId,
			tagIds: tagIds,
			note,
			isBacklog: isBacklog || false,
			skipped: skipped || false,
			planPeriod,
		};

		// Create all tasks for the series
		const createdTasks = await createTasksFromSeries(series, taskTemplate, occurrences);
		
		// Update series with occurrence info
		if (occurrences.length > 0) {
			series.firstOccurrenceAt = Math.min(...occurrences);
			series.lastOccurrenceAt = Math.max(...occurrences);
			await series.save();
		}

		return res.status(201).json({ 
			series, 
			tasks: createdTasks,
			message: `Created ${createdTasks.length} recurring tasks`
		});
	} catch (error) {
		console.error('Error creating task:', error);
		res.status(400).json({ error: error.message });
	}
};


// Get all tasks for the authenticated user
exports.getUserTasks = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();
		const tasks = await Task.find({ userId: user._id });

		res.status(200).json(tasks);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// Query tasks for authenticated user
exports.queryTasks = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();

		// Parse the `q` parameter
		let query = req.query.q ? JSON.parse(req.query.q) : {};
		query.userId = user._id;

		// Use the query to filter tasks
		const tasks = await Task.find(query);

		res.status(200).json(tasks);
	} catch (error) {
		console.error("Error in queryTasks:", error);
		res.status(500).json({ error: error.message });
	}
};

// Get a task by ID (only if owned by the authenticated user)
exports.getTaskById = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();

		const task = await Task.findOne({
			_id: req.params.id,
			userId: user._id
		});

		if (!task) {
			return res.status(404).json({
				message: 'Task not found or not authorized'
			});
		}

		res.status(200).json(task);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// Delete a task by ID with support for recurring task delete modes
exports.deleteTaskById = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();
		
		// Extract delete mode from request body or query
		const deleteMode = req.body.deleteMode || req.query.deleteMode || 'single';

		// Find the task first
		const task = await Task.findOne({
			_id: req.params.id,
			userId: user._id
		});

		if (!task) {
			return res.status(404).json({
				message: 'Task not found or not authorized'
			});
		}

		// Handle different delete modes
		switch (deleteMode) {
			case 'single':
		  default: {
				// Delete only this specific task
				await Task.findByIdAndDelete(task._id);
				return res.status(200).json({
					message: 'Single task deleted successfully'
				});
      }

			case 'all':
				// Delete all tasks in the series
				if (!task.seriesId) {
					// If no series, treat as single task
					await Task.findByIdAndDelete(task._id);
					return res.status(200).json({
						message: 'Task deleted successfully'
					});
				}

				// Delete all tasks in the series
				const deleteResult = await Task.deleteMany({
					seriesId: task.seriesId,
					userId: user._id
				});

				// Delete the series as well
				await Series.findByIdAndDelete(task.seriesId);

				return res.status(200).json({
					message: `Deleted ${deleteResult.deletedCount} tasks and the series`
				});

			case 'following':
				// Delete this task and all following tasks in the series
				if (!task.seriesId) {
					// If no series, treat as single task
					await Task.findByIdAndDelete(task._id);
					return res.status(200).json({
						message: 'Task deleted successfully'
					});
				}

				// Delete all tasks in the series that start at or after the current task
				const deleteFollowingResult = await Task.deleteMany({
					seriesId: task.seriesId,
					startTime: { $gte: task.startTime },
					userId: user._id
				});

				// Update the series lastOccurrenceAt if there are remaining tasks
				const remainingTasks = await Task.find({
					seriesId: task.seriesId,
					userId: user._id
				}).sort({ startTime: -1 }).limit(1);

				if (remainingTasks.length > 0) {
					await Series.findByIdAndUpdate(task.seriesId, {
						lastOccurrenceAt: remainingTasks[0].startTime
					});
				} else {
					// If no tasks remain, delete the series
					await Series.findByIdAndDelete(task.seriesId);
				}

				return res.status(200).json({
					message: `Deleted ${deleteFollowingResult.deletedCount} following tasks`
				});
		}
	} catch (error) {
		console.error('Error deleting task:', error);
		res.status(500).json({ error: error.message });
	}
};

// Get series information for a task
exports.getTaskSeries = async (req, res) => {
	try {
		const user = getCurrentUser();
		
		const task = await Task.findOne({
			_id: req.params.id,
			userId: user._id
		});

		if (!task) {
			return res.status(404).json({
				message: 'Task not found or not authorized'
			});
		}

		if (!task.seriesId) {
			return res.status(200).json({
				message: 'Task is not part of a recurring series',
				isRecurring: false
			});
		}

		const series = await Series.findById(task.seriesId);
		const seriesTasks = await Task.find({
			seriesId: task.seriesId,
			userId: user._id
		}).sort({ startTime: 1 });

		return res.status(200).json({
			series,
			tasks: seriesTasks,
			currentTaskIndex: seriesTasks.findIndex(t => t._id.toString() === task._id.toString()),
			isRecurring: true
		});

	} catch (error) {
		console.error('Error getting task series:', error);
		res.status(500).json({ error: error.message });
	}
};

// Update a task by ID with support for recurring task update modes
exports.updateTaskById = async (req, res) => {
  try {
    // Get the current user from context
    const user = getCurrentUser();

    // Extract update mode from request body or query
		let updateMode = req.body.updateMode || req.query.updateMode || 'single';
		const payload = { ...req.body };
		delete payload.updateMode; // Remove updateMode from actual update data

    // Find the task first
		const task = await Task.findOne({
			_id: req.params.id,
			userId: user._id
		});

    if (!task) {
			return res.status(404).json({
				message: 'Task not found or not authorized'
			});
		}

     // CASE 1: Non-recurring task
    if (!task.seriesId) {
      // Check if the update contains recurrence - convert to recurring series
      if (payload.recurrence) {
        // Convert non-recurring task to recurring series
        const {
          title,
          description,
          status,
          startTime,
          endTime,
          dueTime,
          priority,
          type,
          recurrence,
          goalId,
          tagIds,
          note,
          isBacklog,
          skipped,
          planPeriod,
        } = { ...task.toObject(), ...payload };

        // Create the series record
        const series = new Series({
          title: title || 'Recurring series',
          description,
          recurrence,
          userId: user._id,
          goalId,
          tagIds: tagIds || [],
          priority: priority || 1,
          color: '#8B5CF6'
        });
        await series.save();

        // Generate occurrences based on recurrence
        const occurrences = generateOccurrences({
          startTime: startTime || task.startTime,
          recurrence
        });

        // Create task template
        const taskTemplate = {
          title,
          description,
          status: status || task.status,
          startTime: startTime || task.startTime,
          endTime,
          dueTime,
          priority: priority || task.priority,
          type: type || task.type,
          userId: user._id,
          goalId,
          tagIds: tagIds || task.tagIds,
          note,
          isBacklog: isBacklog || task.isBacklog,
          skipped: skipped || task.skipped,
          planPeriod,
        };

        // Delete the original non-recurring task
        await Task.findByIdAndDelete(task._id);

        // Create all tasks for the series
        const createdTasks = await createTasksFromSeries(series, taskTemplate, occurrences);
        
        // Update series with occurrence info
        if (occurrences.length > 0) {
          series.firstOccurrenceAt = Math.min(...occurrences);
          series.lastOccurrenceAt = Math.max(...occurrences);
          await series.save();
        }

        return res.status(200).json({ 
          series, 
          tasks: createdTasks,
          message: `Converted to recurring series with ${createdTasks.length} tasks`
        });
      } else {
        // Simple update - no recurrence, just update the single task
        const updatedTask = await Task.findByIdAndUpdate(
          task._id,
          payload,
          { new: true, runValidators: true }
        );

        return res.status(200).json({
          task: updatedTask,
          message: 'Task updated successfully'
        });
      }
    }

     // CASE 2: Recurring task
		const series = await Series.findById(task.seriesId);
		if (!series) {
			return res.status(404).json({ message: 'Series not found' });
		}
 
		switch (updateMode) {
			case 'single':
			default: {
				// Update only this specific task, no changes to series or other tasks
				const singleTaskUpdateData = { ...payload };
				delete singleTaskUpdateData.recurrence;
				
				const updatedTask = await Task.findByIdAndUpdate(
					task._id,
					singleTaskUpdateData,
					{ new: true, runValidators: true }
				);

				return res.status(200).json({
					task: updatedTask,
					message: 'Single recurring task updated successfully'
				});
			}

			case 'all': {
				const recurrenceChanged = payload.recurrence && !compareTwoRecurrence(payload.recurrence, series.recurrence);
				const timeChanged = (payload.startTime && payload.startTime !== task.startTime) ||
										(payload.endTime && payload.endTime !== task.endTime);

				if (recurrenceChanged || timeChanged) {
					// Create a brand new series based on payload's recurrence, starting from old series first occurrence
					let firstStart = series.firstOccurrenceAt;
					if (!firstStart) {
						const firstTask = await Task.findOne({ seriesId: series._id, userId: user._id }).sort({ startTime: 1 });
						firstStart = firstTask ? firstTask.startTime : task.startTime;
					}
					const newRecurrence = payload.recurrence || series.recurrence;

					const merged = { ...series.toObject(), ...payload };
					const newSeries = new Series({
						title: merged.title || 'Recurring series',
						description: merged.description,
						recurrence: newRecurrence,
						userId: user._id,
						goalId: merged.goalId,
						tagIds: merged.tagIds || [],
						priority: merged.priority || 1,
						color: series.color || '#8B5CF6'
					});
					await newSeries.save();

					const occurrences = generateOccurrences({
					// Align startTime to use the date from firstStart and time from payload.startTime in recurrence timezone
					startTime: (() => {
						const tz = newRecurrence && newRecurrence.timezone;
						if (!tz || !payload.startTime) return firstStart;
						const dateInTz = DateTime.fromMillis(firstStart, { zone: tz });
						const timeInTz = DateTime.fromMillis(payload.startTime, { zone: tz });
						const merged = DateTime.fromObject({
							year: dateInTz.year,
							month: dateInTz.month,
							day: dateInTz.day,
							hour: timeInTz.hour,
							minute: timeInTz.minute,
							second: timeInTz.second,
							millisecond: timeInTz.millisecond,
						}, { zone: tz });
						return merged.toMillis();
					})(),
						recurrence: newRecurrence
					});

					const baseDuration = (payload.endTime && payload.startTime) ? (payload.endTime - payload.startTime) : 0;
					const taskTemplate = {
						title: merged.title,
						description: merged.description,
						status: merged.status || 'todo',
						startTime: firstStart,
						endTime: firstStart + baseDuration,
						priority: merged.priority || 1,
						type: merged.type || 'task',
						userId: user._id,
						goalId: merged.goalId,
						tagIds: merged.tagIds || [],
						note: merged.note,
						isBacklog: merged.isBacklog || false,
						skipped: merged.skipped || false,
						planPeriod: merged.planPeriod
					};

					const newTasks = await createTasksFromSeries(newSeries, taskTemplate, occurrences);

					if (occurrences.length > 0) {
						newSeries.firstOccurrenceAt = Math.min(...occurrences);
						newSeries.lastOccurrenceAt = Math.max(...occurrences);
						await newSeries.save();
					}

					// Clean up old series and tasks
					await Task.deleteMany({ seriesId: series._id, userId: user._id });
					await Series.findByIdAndDelete(series._id);

					return res.status(200).json({
						message: `Recurrence changed. Created new series with ${newTasks.length} tasks and deleted old series`
					});
				}

				// bulk update other fields
				await bulkUpdateOtherFieldsInTasksInSeries(user._id, series._id, payload);
				return res.status(200).json({ message: 'Updated all recurring tasks in series' });
			}

			case 'following': {
				const recurrenceChanged = payload.recurrence && !compareTwoRecurrence(payload.recurrence, series.recurrence);
				const timeChanged = (payload.startTime && payload.startTime !== task.startTime) ||
											(payload.endTime && payload.endTime !== task.endTime);

				// Prepare fields to apply to tasks (exclude scheduling fields)
				const fieldsToApply = { ...payload };
				delete fieldsToApply.recurrence;
				delete fieldsToApply.startTime;
				delete fieldsToApply.endTime;
				delete fieldsToApply.dueTime;
				delete fieldsToApply.completeTime;

				if (recurrenceChanged || timeChanged) {
					// Start a new series for this and following occurrences
					const newRecurrence = payload.recurrence || series.recurrence;
					const merged = { ...series.toObject(), ...payload };
					const newSeries = new Series({
						title: merged.title || 'Recurring series',
						description: merged.description,
						recurrence: newRecurrence,
						userId: user._id,
						goalId: merged.goalId,
						tagIds: merged.tagIds || [],
						priority: merged.priority || 1,
						color: series.color || '#8B5CF6'
					});
					await newSeries.save();

					// Compute the new series start time: date from current task, time from payload.startTime (if provided) in recurrence timezone
					const startForNew = (() => {
						const tz = newRecurrence && newRecurrence.timezone;
						if (!tz || !payload.startTime) return task.startTime;
						const dateInTz = DateTime.fromMillis(task.startTime, { zone: tz });
						const timeInTz = DateTime.fromMillis(payload.startTime, { zone: tz });
						const mergedTs = DateTime.fromObject({
							year: dateInTz.year,
							month: dateInTz.month,
							day: dateInTz.day,
							hour: timeInTz.hour,
							minute: timeInTz.minute,
							second: timeInTz.second,
							millisecond: timeInTz.millisecond,
						}, { zone: tz });
						return mergedTs.toMillis();
					})();

					// Determine base duration
					const baseDuration = (payload.endTime && payload.startTime)
						? (payload.endTime - payload.startTime)
						: ((task.endTime && task.startTime) ? (task.endTime - task.startTime) : 0);

					// Build task template for new series
					const taskTemplate = {
						title: merged.title,
						description: merged.description,
						status: merged.status || task.status || 'todo',
						startTime: startForNew,
						endTime: startForNew + baseDuration,
						priority: merged.priority || task.priority || 1,
						type: merged.type || task.type || 'task',
						userId: user._id,
						goalId: merged.goalId,
						tagIds: merged.tagIds || task.tagIds || [],
						note: merged.note,
						isBacklog: merged.isBacklog || task.isBacklog || false,
						skipped: merged.skipped || task.skipped || false,
						planPeriod: merged.planPeriod
					};

					// Generate new occurrences according to newRecurrence starting from this occurrence
					const occurrences = generateOccurrences({
						startTime: startForNew,
						recurrence: newRecurrence
					});

					// Delete this and following tasks from the old series
					await Task.deleteMany({
						seriesId: series._id,
						userId: user._id,
						startTime: { $gte: task.startTime }
					});

					// Create tasks for the new series
					const newTasks = await createTasksFromSeries(newSeries, taskTemplate, occurrences);

					// Update new series occurrence bounds
					if (occurrences.length > 0) {
						newSeries.firstOccurrenceAt = Math.min(...occurrences);
						newSeries.lastOccurrenceAt = Math.max(...occurrences);
						await newSeries.save();
					}

					// Update old series occurrence bounds or delete if empty
					const remainingOld = await Task.find({ seriesId: series._id, userId: user._id }).sort({ startTime: 1 });
					if (remainingOld.length > 0) {
						await Series.findByIdAndUpdate(series._id, {
							firstOccurrenceAt: remainingOld[0].startTime,
							lastOccurrenceAt: remainingOld[remainingOld.length - 1].startTime
						});
					} else {
						await Series.findByIdAndDelete(series._id);
					}

					// Apply other field updates to this-and-following tasks across series
					if (Object.keys(fieldsToApply).length > 0) {
						await Task.updateMany(
							{ userId: user._id, $or: [ { seriesId: newSeries._id }, { seriesId: series._id, startTime: { $gte: task.startTime } } ] },
							{ $set: fieldsToApply }
						);
					}

					return res.status(200).json({ message: `Recurrence/time changed. Split series and created new series with ${newTasks.length} tasks` });
				}

				// No recurrence/time change: update other fields for this and following tasks in the existing series
				if (Object.keys(fieldsToApply).length > 0) {
					await Task.updateMany(
						{ userId: user._id, seriesId: series._id, startTime: { $gte: task.startTime } },
						{ $set: fieldsToApply }
					);
				}

				return res.status(200).json({ message: 'Updated this and following recurring tasks in series' });
			}
    }
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
};


const createTasksFromSeries = async (series, taskTemplate, occurrences) => {
	const baseDuration = taskTemplate.endTime - taskTemplate.startTime;

	const tasksToInsert = occurrences.map((occurrenceStart) => {
		const computedEndTime = occurrenceStart + baseDuration;
		return {
			...taskTemplate,
			startTime: occurrenceStart,
			endTime: computedEndTime,
			seriesId: series._id,
			isRecurring: true
		};
	});

	return await Task.insertMany(tasksToInsert);
};

async function bulkUpdateOtherFieldsInTasksInSeries(userId, seriesId, payload) {
  const fieldsToApply = { ...payload };
  delete fieldsToApply.recurrence;
  delete fieldsToApply.startTime;
  delete fieldsToApply.endTime;
  delete fieldsToApply.dueTime;
  delete fieldsToApply.completeTime;

  if (Object.keys(fieldsToApply).length === 0) return;

  await Task.updateMany(
    { userId, seriesId },
    { $set: fieldsToApply }
  );
}
