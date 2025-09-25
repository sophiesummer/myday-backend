const mongoose = require('mongoose');
const { RecursionSchema } = require('./recursion');

const SeriesSchema = new mongoose.Schema({
	title: { type: String, required: true },
	description: { type: String }, // Changed from 'notes' to match Task schema
	
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
	
	// Recurrence pattern
	recurrence: {
		type: RecursionSchema,
		required: true // Required for series as they define recurring patterns
	},

	// Occurrence tracking
	firstOccurrenceAt: { type: Number },
	lastOccurrenceAt: { type: Number },

	// Series splitting support for "this and following" operations
	parentSeriesId: { 
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Series',
		required: false
	},
	splitFromOccurrenceOn: { type: Number },

	// Metadata
	color: { type: String, default: '#8B5CF6' },
	active: { type: Boolean, default: true },
	priority: { type: Number, default: 1 },

}, { timestamps: true });

// Index to improve query performance for user's series
SeriesSchema.index({ userId: 1 });

module.exports = mongoose.model('Series', SeriesSchema);
