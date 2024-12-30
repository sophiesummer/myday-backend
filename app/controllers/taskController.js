const Task = require('../models/task');

// Create a new task
exports.createTask = async (req, res) => {
	try {
		const task = new Task(req.body);
		await task.save();
		res.status(201).json(task);
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

// Get all tasks
exports.getAllTasks = async (req, res) => {
	try {
		const tasks = await Task.find();
		res.status(200).json(tasks);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};
