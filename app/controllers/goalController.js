const Goal = require('../models/goal');
const { getCurrentUser } = require('../middleware/firebaseAuth');
const mongoose = require('mongoose');

// Create a new goal
exports.createGoal = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();

		// Add the authenticated user's ID to the goal
		const goal = new Goal({
			...req.body,
			userId: user._id
		});

		await goal.save();
		res.status(201).json(goal);
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

// Get all goals for the authenticated user
exports.getUserGoals = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();
		const goals = await Goal.find({ userId: user._id });

		res.status(200).json(goals);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// Query goals for authenticated user
exports.queryGoals = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();

		// Parse the `q` parameter
		let query = req.query.q ? JSON.parse(req.query.q) : {};
		query.userId = user._id;

		// Use the query to filter goals
		const goals = await Goal.find(query);

		res.status(200).json(goals);
	} catch (error) {
		console.error("Error in queryGoals:", error);
		res.status(500).json({ error: error.message });
	}
};

// Get a goal by ID (only if owned by the authenticated user)
exports.getGoalById = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();

		const goal = await Goal.findOne({
			_id: req.params.id,
			userId: user._id
		});

		if (!goal) {
			return res.status(404).json({
				message: 'Goal not found or not authorized'
			});
		}

		res.status(200).json(goal);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// Update a goal by ID (only if owned by the authenticated user)
exports.updateGoalById = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();

		const goal = await Goal.findOneAndUpdate(
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

		if (!goal) {
			return res.status(404).json({
				message: 'Goal not found or not authorized'
			});
		}

		res.status(200).json(goal);
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

// Delete a goal by ID (only if owned by the authenticated user)
exports.deleteGoalById = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();

		const goal = await Goal.findOneAndDelete({
			_id: req.params.id,
			userId: user._id
		});

		if (!goal) {
			return res.status(404).json({
				message: 'Goal not found or not authorized'
			});
		}

		res.status(200).json({ message: 'Goal deleted successfully' });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};
