const mongoose = require('mongoose');

// Day of week enum
const DayOfWeek = {
	SUNDAY: 0,
	MONDAY: 1,
	TUESDAY: 2,
	WEDNESDAY: 3,
	THURSDAY: 4,
	FRIDAY: 5,
	SATURDAY: 6
};

const RecursionSchema = new mongoose.Schema({
	frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], required: true }, // Recurrence frequency
	interval: { type: Number, default: 1 }, // Interval between recurrences, Repeat every x days, weeks, months, or years
	endDate: { type: Number }, // When the recurrence should stop (timestamp)
	count: { type: Number, default: 0 }, // Number of times the task has been recurred
	daysOfWeek: { type: [Number], enum: Object.values(DayOfWeek), required: false }, // Day of the week to repeat on, 0 is Sunday, 1 is Monday, etc.
	dayOfMonth: { type: Number, required: false }, // Day of the month to repeat on, 1-31
	weekAndDayOfMonth: {
		dayOfWeek: { type: Number, enum: Object.values(DayOfWeek), required: false },
		weekOfMonth: { type: Number, min: 1, max: 5, required: false } // 1-5 for first through fifth occurrence
	},
	timezone: { type: String, required: true }, // Timezone to use for the recurrence
});


module.exports = { RecursionSchema, DayOfWeek };
