const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
	title: { type: String, required: true },
	description: { type: String, required: true },
	createdAt: { type: Number, default: () => Date.now() },
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	color: { type: String, default: '#b9c7c6' }, // Default blue color  // hex
}, { timestamps: true });

// Index to improve query performance for user's goals
TagSchema.index({ userId: 1 });

module.exports = mongoose.model('Tag', TagSchema);
