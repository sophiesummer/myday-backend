/**
 * Task Controller with Recurring Task Support
 * 
 * This controller handles both single and recurring tasks with the following features:
 * 
 * CREATE TASK:
 * - Single tasks: Create one task without recurrence
 * - Recurring tasks: Create a Series and generate all task occurrences based on recurrence pattern
 * 
 * UPDATE TASK:
 * - 'single' mode: Update only the specific task instance
 * - 'all' mode: Update all tasks in the recurring series
 * - 'following' mode: Split the series and update this task and all following occurrences
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
 */

const Task = require('../models/task');
const Series = require('../models/series');
const { getCurrentUser } = require('../middleware/firebaseAuth');
const { generateOccurrences } = require('../utils/recurrenceUtils');
const mongoose = require('mongoose');

// Helper function to create tasks from series
const createTasksFromSeries = async (series, taskTemplate, occurrences) => {
	const baseDuration = typeof taskTemplate.endTime === 'number' && typeof taskTemplate.startTime === 'number' && taskTemplate.endTime > taskTemplate.startTime
		? (taskTemplate.endTime - taskTemplate.startTime)
		: undefined;

	const tasksToInsert = occurrences.map((occurrenceStart) => {
		const computedEndTime = baseDuration ? (occurrenceStart + baseDuration) : taskTemplate.endTime;
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
			tagId, // for backward compatibility
			note,
			isBacklog,
			skipped,
			planPeriod,
		} = payload;

		// Create the series record
		const series = new Series({
			title: title || 'Untitled Series',
			description,
			recurrence,
			userId: user._id,
			goalId,
			tagIds: tagIds || (tagId ? [tagId] : []),
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
			tagIds: tagIds || (tagId ? [tagId] : []),
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

// Helper function to split a series for "this and following" updates
const splitSeriesFromTask = async (task, updateData, user) => {
	const originalSeries = await Series.findById(task.seriesId);
	if (!originalSeries) {
		throw new Error('Original series not found');
	}

	// Create new series for "this and following" tasks
	const newSeries = new Series({
		title: updateData.title || originalSeries.title,
		description: updateData.description || originalSeries.description,
		recurrence: originalSeries.recurrence,
		userId: user._id,
		goalId: updateData.goalId || originalSeries.goalId,
		tagIds: updateData.tagIds || originalSeries.tagIds || [],
		parentSeriesId: originalSeries._id,
		splitFromOccurrenceOn: task.startTime,
		color: updateData.color || originalSeries.color,
		priority: updateData.priority || originalSeries.priority
	});
	await newSeries.save();

	// Find all tasks in the original series that start at or after the current task
	const tasksToUpdate = await Task.find({
		seriesId: originalSeries._id,
		startTime: { $gte: task.startTime },
		userId: user._id
	}).sort({ startTime: 1 });

	// Update all these tasks to belong to the new series and apply changes
	const updatePromises = tasksToUpdate.map(async (taskToUpdate) => {
		const taskUpdateData = {
			...updateData,
			seriesId: newSeries._id
		};
		
		// Only preserve startTime and endTime if not explicitly provided in update
		// This maintains the scheduling of individual occurrences
		if (!updateData.hasOwnProperty('startTime')) {
			delete taskUpdateData.startTime;
		}
		if (!updateData.hasOwnProperty('endTime')) {
			delete taskUpdateData.endTime;
		}
		
		return Task.findByIdAndUpdate(
			taskToUpdate._id,
			{ $set: taskUpdateData }, // Use $set for complete field overwriting
			{ new: true, runValidators: true }
		);
	});

	const updatedTasks = await Promise.all(updatePromises);

	// Update the new series occurrence info
	if (updatedTasks.length > 0) {
		const startTimes = updatedTasks.map(t => t.startTime);
		newSeries.firstOccurrenceAt = Math.min(...startTimes);
		newSeries.lastOccurrenceAt = Math.max(...startTimes);
		await newSeries.save();
	}

	return { newSeries, updatedTasks };
};

// Update a task by ID with support for recurring task update modes
exports.updateTaskById = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();
		
		// Extract update mode from request body or query
		const updateMode = req.body.updateMode || req.query.updateMode || 'single';
		const updateData = { ...req.body };
		delete updateData.updateMode; // Remove updateMode from actual update data

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

		// Handle different update modes
		switch (updateMode) {
			case 'single':
				// Update only this specific task - complete field overwriting
				const updatedTask = await Task.findByIdAndUpdate(
					task._id,
					{ $set: updateData }, // Use $set for complete field overwriting
					{
						new: true,
						runValidators: true
					}
				);
				return res.status(200).json({
					task: updatedTask,
					message: 'Single task updated successfully'
				});

			case 'all':
				// Update all tasks in the series
				if (!task.seriesId) {
					// If no series, treat as single task
					const updatedTask = await Task.findByIdAndUpdate(
						task._id,
						{ $set: updateData }, // Use $set for complete field overwriting
						{
							new: true,
							runValidators: true
						}
					);
					return res.status(200).json({
						task: updatedTask,
						message: 'Task updated successfully'
					});
				}

				// Update all tasks in the series
				const seriesTasks = await Task.find({
					seriesId: task.seriesId,
					userId: user._id
				});

				// Prepare update data that completely overwrites specified fields
				const updateAllPromises = seriesTasks.map(async (seriesTask) => {
					// Create complete update object that overwrites all specified fields
					const taskUpdateData = { ...updateData };
					
					// Only preserve startTime and endTime if not explicitly provided in update
					// This maintains the scheduling of individual occurrences
					if (!updateData.hasOwnProperty('startTime')) {
						delete taskUpdateData.startTime;
					}
					if (!updateData.hasOwnProperty('endTime')) {
						delete taskUpdateData.endTime;
					}
					
					return Task.findByIdAndUpdate(
						seriesTask._id,
						{ $set: taskUpdateData }, // Use $set for complete field overwriting
						{ new: true, runValidators: true }
					);
				});

				const allUpdatedTasks = await Promise.all(updateAllPromises);

				// Update the series if needed
				if (task.seriesId && (updateData.title || updateData.description)) {
					await Series.findByIdAndUpdate(task.seriesId, {
						$set: {
							title: updateData.title,
							description: updateData.description,
							goalId: updateData.goalId,
							tagIds: updateData.tagIds,
							priority: updateData.priority,
							color: updateData.color
						}
					}, { omitUndefined: true }); // Only update fields that are defined
				}

				return res.status(200).json({
					tasks: allUpdatedTasks,
					message: `Updated ${allUpdatedTasks.length} tasks in the series`
				});

			case 'following':
				// Update this task and all following tasks in the series
				if (!task.seriesId) {
					// If no series, treat as single task
					const updatedTask = await Task.findByIdAndUpdate(
						task._id,
						{ $set: updateData }, // Use $set for complete field overwriting
						{
							new: true,
							runValidators: true
						}
					);
					return res.status(200).json({
						task: updatedTask,
						message: 'Task updated successfully'
					});
				}

				// Split the series and update following tasks
				const { newSeries, updatedTasks } = await splitSeriesFromTask(task, updateData, user);

				return res.status(200).json({
					newSeries,
					tasks: updatedTasks,
					message: `Split series and updated ${updatedTasks.length} following tasks`
				});

			default:
				return res.status(400).json({
					error: 'Invalid update mode. Use "single", "all", or "following"'
				});
		}

	} catch (error) {
		console.error('Error updating task:', error);
		res.status(400).json({ error: error.message });
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
				// Delete only this specific task
				await Task.findByIdAndDelete(task._id);
				return res.status(200).json({
					message: 'Single task deleted successfully'
				});

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

			default:
				return res.status(400).json({
					error: 'Invalid delete mode. Use "single", "all", or "following"'
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

