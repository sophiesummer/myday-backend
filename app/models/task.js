const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
	title: { type: String, required: true },
	description: { type: String },
	status: { type: String, enum: ['todo', 'in progress', 'pending', 'done', 'closed'], default: 'todo' },
	startTime: { type: Number, default: () => Date.now() },
	endTime: { type: Number },
	dueTime: { type: Number },
	completeTime: { type: Number },
	priority: { type: Number, default: 1 },
	type: { type: String, enum: ['task', 'holiday', 'birthday', 'events', 'reminder'], default: 'task' },
	
	// Recurring task fields
	isRecurring: { type: Boolean, default: false },
	seriesId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Series',
		required: false
	},
	
	// User and relationships
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
	tagIds: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Tag',
		required: false
	}],
	note: { type: String },
	isBacklog: { type: Boolean, default: false },
	skipped: { type: Boolean, default: false },
	planPeriod: { type: String }, // e.g., '2025-W12' or '2025-03-23' for day
	
	// Internal fields
	internalStatus: { type: String },
}, { timestamps: true });

// Index to improve query performance for user's tasks
TaskSchema.index({ userId: 1 });
TaskSchema.index({ seriesId: 1 });
TaskSchema.index({ tagIds: 1 });

module.exports = mongoose.model('Task', TaskSchema);
