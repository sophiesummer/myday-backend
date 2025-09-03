const Tag = require('../models/tag');
const { getCurrentUser } = require('../middleware/firebaseAuth');
const mongoose = require('mongoose');

// Create a new tag
exports.createTag = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();

		// Add the authenticated user's ID to the tag
		const tag = new Tag({
			...req.body,
			userId: user._id
		});

		await tag.save();
		res.status(201).json(tag);
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

// Get all tags for the authenticated user
exports.getUserTags = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();
		const tags = await Tag.find({ userId: user._id });

		res.status(200).json(tags);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// Query tags for authenticated user
exports.queryTags = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();

		// Parse the `q` parameter
		let query = req.query.q ? JSON.parse(req.query.q) : {};
		query.userId = user._id;

		// Use the query to filter tags
		const tags = await Tag.find(query);

		res.status(200).json(tags);
	} catch (error) {
		console.error("Error in queryTags:", error);
		res.status(500).json({ error: error.message });
	}
};

// Get a tag by ID (only if owned by the authenticated user)
exports.getTagById = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();

		const tag = await Tag.findOne({
			_id: req.params.id,
			userId: user._id
		});

		if (!tag) {
			return res.status(404).json({
				message: 'Tag not found or not authorized'
			});
		}

		res.status(200).json(tag);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// Update a tag by ID (only if owned by the authenticated user)
exports.updateTagById = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();

		const tag = await Tag.findOneAndUpdate(
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

		if (!tag) {
			return res.status(404).json({
				message: 'Tag not found or not authorized'
			});
		}

		res.status(200).json(tag);
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

// Delete a tag by ID (only if owned by the authenticated user)
exports.deleteTagById = async (req, res) => {
	try {
		// Get the current user from context
		const user = getCurrentUser();

		const tag = await Tag.findOneAndDelete({
			_id: req.params.id,
			userId: user._id
		});

		if (!tag) {
			return res.status(404).json({
				message: 'Tag not found or not authorized'
			});
		}

		res.status(200).json({ message: 'Tag deleted successfully' });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};
