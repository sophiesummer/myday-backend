const Task = require('../models/task');

// Create a new task
exports.createTask = async (req, res) => {
	try {
		// Add the authenticated user's ID to the task
		const task = new Task({
			...req.body,
			userId: req.user._id
		});
		
		await task.save();
		res.status(201).json({
			success: true,
			task
		});
	} catch (error) {
		res.status(400).json({ success: false, error: error.message });
	}
};

// Get all tasks for the authenticated user
exports.getUserTasks = async (req, res) => {
	try {
		const tasks = await Task.find({ userId: req.user._id });
		
		res.status(200).json({
			success: true,
			count: tasks.length,
			tasks
		});
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

// Query tasks for authenticated user
exports.queryTasks = async (req, res) => {
	try {
		// Parse the `q` parameter
		let query = req.query.q ? JSON.parse(req.query.q) : {};
		
		// Always enforce user ownership by adding userId to the query
		query = { ...query, userId: req.user._id };
		
		// Use the query to filter tasks
		const tasks = await Task.find(query);
		
		res.status(200).json({
			success: true,
			count: tasks.length,
			tasks
		});
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

// Get a task by ID (only if owned by the authenticated user)
exports.getTaskById = async (req, res) => {
	try {
		const task = await Task.findOne({ 
			_id: req.params.id,
			userId: req.user._id
		});
		
		if (!task) {
			return res.status(404).json({ 
				success: false, 
				message: 'Task not found or not authorized' 
			});
		}
		
		res.status(200).json({
			success: true,
			task
		});
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

// Update a task by ID (only if owned by the authenticated user)
exports.updateTaskById = async (req, res) => {
	try {
		const task = await Task.findOneAndUpdate(
			{ 
				_id: req.params.id,
				userId: req.user._id
			}, 
			req.body,
			{
				new: true, // Return the updated document
				runValidators: true, // Validate fields before updating
			}
		);
		
		if (!task) {
			return res.status(404).json({ 
				success: false, 
				message: 'Task not found or not authorized' 
			});
		}
		
		res.status(200).json({
			success: true,
			task
		});
	} catch (error) {
		res.status(400).json({ success: false, error: error.message });
	}
};

// Delete a task by ID (only if owned by the authenticated user)
exports.deleteTaskById = async (req, res) => {
	try {
		const task = await Task.findOneAndDelete({ 
			_id: req.params.id,
			userId: req.user._id
		});
		
		if (!task) {
			return res.status(404).json({ 
				success: false, 
				message: 'Task not found or not authorized' 
			});
		}
		
		res.status(200).json({ 
			success: true,
			message: 'Task deleted successfully' 
		});
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

