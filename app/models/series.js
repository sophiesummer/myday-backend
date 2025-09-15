const mongoose = require('mongoose');

const SeriesSchema = new mongoose.Schema({
	title: { type: String, required: true },
	notes: { type: String },
	createdAt: { type: Number, default: () => Date.now() },
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	tagId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Tag',
		required: false
	},
	// Recurrence; null => single task series (will have a single occurrence)
	recurrence: {
		type: RecursionSchema,
		required: false
	},

	// Windowing control for materialization
	firstOccurrenceAt: { type: Number },
	lastOccurrenceAt: { type: Number },

	// For “this and following” splits
	parentSeriesId: { type: String },
	splitFromOccurrenceOn: { type: Number },

	color: { type: String, default: '#8B5CF6' }, // Default purple color
	active: { type: Boolean, default: true },
	// Series metadata
	metadata: {
		totalTasks: { type: Number, default: 0 },
		completedTasks: { type: Number, default: 0 }
	}
}, { timestamps: true });

// Index to improve query performance for user's series
SeriesSchema.index({ userId: 1 });

module.exports = mongoose.model('Series', SeriesSchema);
