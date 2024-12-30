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
	startTime: { type: Number },
	endTime: { type: Number },
	priority: { type: Number, default: 1 },
	recursion: { type: RecursionSchema, default: null },
	userId: { type: String },
});

module.exports = mongoose.model('Task', TaskSchema);
