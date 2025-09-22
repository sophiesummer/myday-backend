const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
	title: { type: String, required: true },
	description: { type: String, required: false },
	createdAt: { type: Number, default: () => Date.now() },
	updatedAt: { type: Number, default: () => Date.now() },
	startTime: { type: Number, default: () => Date.now() },
	endTime: { type: Number },
	targetDate: { type: Number },
	completeTime: { type: Number },
	status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	color: { type: String, default: '#3B82F6' }, // Default blue color
}, { timestamps: true });

// Index to improve query performance for user's goals
GoalSchema.index({ userId: 1 });

module.exports = mongoose.model('Goal', GoalSchema);
