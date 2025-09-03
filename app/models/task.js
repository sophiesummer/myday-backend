const mongoose = require('mongoose');
const { RecursionSchema, DayOfWeek } = require('./recursion');

const TaskSchema = new mongoose.Schema({
	title: { type: String, required: true },
	description: { type: String },
	status: { type: String, enum: ['todo', 'in progress', 'pending', 'done', 'closed'], default: 'todo' },
	createdAt: { type: Number, default: () => Date.now() },
	startTime: { type: Number, default: () => Date.now() },
	endTime: { type: Number },
	completeTime: { type: Number },
	priority: { type: Number, default: 1 },
	type: { type: String, enum: ['task', 'holiday', 'birthday', 'events', 'reminder'], default: 'task' },
	recurrenceId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Recursion',
		required: false
	},
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	goalId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Goal',
		required: false
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
