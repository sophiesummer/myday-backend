const mongoose = require('mongoose');

const RecursionSchema = new mongoose.Schema({
	frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], required: true }, // Recurrence frequency
	interval: { type: Number, default: 1 }, // Interval between recurrences
	endDate: { type: Number }, // When the recurrence should stop (timestamp)
});

const TaskSchema = new mongoose.Schema({
	title: { type: String, required: true },
	description: { type: String },
	status: { type: String, enum: ['todo', 'in progress', 'pending', 'done'], default: 'todo' },
	createdAt: { type: Number, default: () => Date.now() },
	startTime: { type: Number, default: () => Date.now() },
	endTime: { type: Number },
	priority: { type: Number, default: 1 },
	recursion: { type: RecursionSchema, default: null },
	userId: { 
		type: mongoose.Schema.Types.ObjectId, 
		ref: 'User',
		required: true
	},
	note: { type: String },
	isBacklog: { type: Boolean, default: false },
	skipped: { type: Boolean, default: false },
	planPeriod: { type: String }, // e.g., '2025-W12' or '2025-03-23' for day
	tag: { type: String },
}, { timestamps: true });

// Index to improve query performance for user's tasks
TaskSchema.index({ userId: 1 });

module.exports = mongoose.model('Task', TaskSchema);
