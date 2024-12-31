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

// Query all tasks
exports.queryTasks = async (req, res) => {
	try {
		// Parse the `q` parameter
		const query = req.query.q ? JSON.parse(req.query.q) : {};

		// Use the query to filter tasks
		const tasks = await Task.find(query);

		res.status(200).json(tasks);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// Get a task by ID
exports.getTaskById = async (req, res) => {
	try {
		const task = await Task.findById(req.params.id); // Find task by ID
		if (!task) return res.status(404).json({ message: 'Task not found' });
		res.status(200).json(task);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// Update a task by ID
exports.updateTaskById = async (req, res) => {
	try {
		const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
			new: true, // Return the updated document
			runValidators: true, // Validate fields before updating
		});
		if (!task) return res.status(404).json({ message: 'Task not found' });
		res.status(200).json(task);
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

// Delete a task by ID
exports.deleteTaskById = async (req, res) => {
	try {
		const task = await Task.findByIdAndDelete(req.params.id); // Delete task by ID
		if (!task) return res.status(404).json({ message: 'Task not found' });
		res.status(200).json({ message: 'Task deleted successfully' });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

