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
const { generateOccurrences } = require('../utils/recurrenceUtils');
const mongoose = require('mongoose');

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

    // for non-recurring task
    if (!task.seriesId) {
      

    }
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
};
