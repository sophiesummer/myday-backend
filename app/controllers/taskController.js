const Task = require('../models/task');
const { getCurrentUser } = require('../middleware/firebaseAuth');
const mongoose = require('mongoose');

// Create a new task
exports.createTask = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();

		// Add the authenticated user's ID to the task
		const task = new Task({
			...req.body,
			userId: user._id
		});

		await task.save();
		res.status(201).json(task);
	} catch (error) {
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

// Update a task by ID (only if owned by the authenticated user)
exports.updateTaskById = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();

		const task = await Task.findOneAndUpdate(
			{
				_id: req.params.id,
				userId: user._id
			},
			req.body,
			{
				new: true, // Return the updated document
				runValidators: true, // Validate fields before updating
			}
		);

		if (!task) {
			return res.status(404).json({
				message: 'Task not found or not authorized'
			});
		}

		res.status(200).json(task);
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

// Delete a task by ID (only if owned by the authenticated user)
exports.deleteTaskById = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();

		const task = await Task.findOneAndDelete({
			_id: req.params.id,
			userId: user._id
		});

		if (!task) {
			return res.status(404).json({
				message: 'Task not found or not authorized'
			});
		}

		res.status(200).json({ message: 'Task deleted successfully' });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

