// Recurrence utility functions for generating task occurrences
const { DateTime } = require('luxon');
const rrulePkg = require('rrule');
const { DayOfWeek } = require('../models/recursion');

function generateOccurrences({ startTime, recurrence }) {
	const MAX_OCCURRENCES = 200;

	// Validate required timezone field
	if (!recurrence.timezone) {
		throw new Error('Timezone is required for recurrence patterns');
	}

	if (recurrence.frequency === 'yearly') {
		return generateYearlyOccurrences({ startTime, recurrence });
	}

	const { RRule } = rrulePkg;

	const localizedStartTime = convertLocalTimeInUTC(startTime, recurrence.timezone);

	const frequencyMap = {
		['daily']: RRule.DAILY,
		['weekly']: RRule.WEEKLY,
		['monthly']: RRule.MONTHLY,
	};

	const ruleOptions = {
		freq: frequencyMap[recurrence.frequency],
		interval: recurrence.interval || 1,
		dtstart: localizedStartTime,
	};

	// Set either count or until (endDate), with count taking priority
	if (recurrence.count) {
		ruleOptions.count = Math.min(MAX_OCCURRENCES, recurrence.count);
	} else if (recurrence.endDate) {
		// Convert endDate to UTC for RRule
		const localizedEndTime = convertLocalTimeInUTC(recurrence.endDate, recurrence.timezone);
		ruleOptions.until = localizedEndTime;
	} else {
		// Default to single occurrence if neither count nor endDate is specified
		ruleOptions.count = 1;
	}

	const weekdayMap = {
		[DayOfWeek.SUNDAY]: RRule.SU,
		[DayOfWeek.MONDAY]: RRule.MO,
		[DayOfWeek.TUESDAY]: RRule.TU,
		[DayOfWeek.WEDNESDAY]: RRule.WE,
		[DayOfWeek.THURSDAY]: RRule.TH,
		[DayOfWeek.FRIDAY]: RRule.FR,
		[DayOfWeek.SATURDAY]: RRule.SA,
	};

	if (recurrence.frequency === 'weekly' && recurrence.daysOfWeek) {
		ruleOptions.byweekday = recurrence.daysOfWeek.map((day) => weekdayMap[day]);
	}

	if (recurrence.frequency === 'monthly') {
		if (recurrence.weekAndDayOfMonth) {
			// Example: first Monday on every month
			const { weekOfMonth, dayOfWeek } = recurrence.weekAndDayOfMonth;
			ruleOptions.byweekday = [weekdayMap[dayOfWeek].nth(weekOfMonth)];
		} else if (recurrence.dayOfMonth) {
			ruleOptions.bymonthday = [recurrence.dayOfMonth];
		}
	}

	const rule = new RRule(ruleOptions);
	const dates = rule.all();

	const listOfTimestamps = dates.map((date) => {
		return convertUTCDateToLocalTime(date.getTime(), recurrence.timezone);
	});

	return listOfTimestamps;
}

function convertLocalTimeInUTC(dateTime, timezone) {
	const localDate = DateTime.fromMillis(dateTime, { zone: timezone });
	// Create a new UTC DateTime object with the same local time components as the local DateTime
	const utcDate = DateTime.utc(localDate.year, localDate.month, localDate.day, localDate.hour, localDate.minute, localDate.second);
	return utcDate.toJSDate();
}

function convertUTCDateToLocalTime(dateTime, timezone) {
	const utcDateTime = DateTime.fromMillis(dateTime, { zone: 'UTC' });
	const localDateTime = DateTime.fromObject(
		{ year: utcDateTime.year, month: utcDateTime.month, day: utcDateTime.day, hour: utcDateTime.hour, minute: utcDateTime.minute, second: utcDateTime.second },
		{ zone: timezone },
	);
	return localDateTime.toMillis();
}

function generateYearlyOccurrences({ startTime, recurrence }) {
	if (recurrence.frequency === 'yearly') {
		// generate occurrences for yearly recurrence with timezone support
		const occurrences = [];
		const timezone = recurrence.timezone || 'UTC';
		
		// Convert startTime to DateTime in the specified timezone
		const startDateTime = DateTime.fromMillis(startTime).setZone(timezone);
		
		// Use dayOfYear and monthOfYear from recurrence, or fall back to startDateTime values
		const dayOfYear = startDateTime.day;
		const monthOfYear = startDateTime.month;
		
		if (recurrence.count) {
			// Generate occurrences based on count
			const countLimit = typeof recurrence?.count === 'number' && recurrence.count > 0 && recurrence.count <= 200 ? recurrence.count : 200;
			for (let i = 0; i < countLimit; i++) {
				const occurrence = DateTime.fromObject({
					year: startDateTime.year + i,
					month: monthOfYear,
					day: dayOfYear,
					hour: startDateTime.hour,
					minute: startDateTime.minute,
					second: startDateTime.second,
					millisecond: startDateTime.millisecond
				}, { zone: timezone });
				
				// Handle invalid dates (e.g., Feb 29 on non-leap years)
				if (occurrence.isValid) {
					occurrences.push(occurrence.toMillis());
				}
			}
		} else if (recurrence.endDate) {
			// Generate occurrences until endDate
			const endDateTime = DateTime.fromMillis(recurrence.endDate).setZone(timezone);
			let currentYear = startDateTime.year;
			
			while (currentYear <= endDateTime.year) {
				const occurrence = DateTime.fromObject({
					year: currentYear,
					month: monthOfYear,
					day: dayOfYear,
					hour: startDateTime.hour,
					minute: startDateTime.minute,
					second: startDateTime.second,
					millisecond: startDateTime.millisecond
				}, { zone: timezone });
				
				// Handle invalid dates and check if within end date
				if (occurrence.isValid && occurrence <= endDateTime) {
					occurrences.push(occurrence.toMillis());
				}
				
				// Break if we've exceeded the end date
				if (occurrence > endDateTime) {
					break;
				}
				
				currentYear += recurrence.interval || 1;
			}
		} else {
			// Default to single occurrence if neither count nor endDate is specified
			const occurrence = DateTime.fromObject({
				year: startDateTime.year,
				month: monthOfYear,
				day: dayOfYear,
				hour: startDateTime.hour,
				minute: startDateTime.minute,
				second: startDateTime.second,
				millisecond: startDateTime.millisecond
			}, { zone: timezone });
			
			if (occurrence.isValid) {
				occurrences.push(occurrence.toMillis());
			}
		}
		return occurrences;
	}
}

/**
 * Deeply compares two recurrence objects to determine if they are identical
 * @param {Object} recurrence1 - First recurrence object to compare
 * @param {Object} recurrence2 - Second recurrence object to compare
 * @returns {boolean} - True if both recurrence objects are identical, false otherwise
 */
function compareTwoRecurrence(recurrence1, recurrence2) {
	// Handle null/undefined cases
	if (recurrence1 === recurrence2) return true;
	if (!recurrence1 || !recurrence2) return false;
	
	// Compare primitive properties
	const primitiveProps = ['frequency', 'interval', 'endDate', 'count', 'dayOfMonth', 'timezone'];
	for (const prop of primitiveProps) {
		if (recurrence1[prop] !== recurrence2[prop]) {
			return false;
		}
	}
	
	// Compare daysOfWeek array
	if (!compareArrays(recurrence1.daysOfWeek, recurrence2.daysOfWeek)) {
		return false;
	}
	
	// Compare weekAndDayOfMonth object
	if (!compareWeekAndDayOfMonth(recurrence1.weekAndDayOfMonth, recurrence2.weekAndDayOfMonth)) {
		return false;
	}
	
	return true;
}

/**
 * Helper function to compare two arrays for deep equality
 * @param {Array} arr1 - First array to compare
 * @param {Array} arr2 - Second array to compare
 * @returns {boolean} - True if arrays are identical, false otherwise
 */
function compareArrays(arr1, arr2) {
	// Handle null/undefined cases
	if (arr1 === arr2) return true;
	if (!arr1 || !arr2) return arr1 === arr2;
	
	// Check length
	if (arr1.length !== arr2.length) return false;
	
	// Sort both arrays to handle different ordering
	const sorted1 = [...arr1].sort();
	const sorted2 = [...arr2].sort();
	
	// Compare each element
	for (let i = 0; i < sorted1.length; i++) {
		if (sorted1[i] !== sorted2[i]) {
			return false;
		}
	}
	
	return true;
}

/**
 * Helper function to compare weekAndDayOfMonth objects
 * @param {Object} obj1 - First weekAndDayOfMonth object to compare
 * @param {Object} obj2 - Second weekAndDayOfMonth object to compare
 * @returns {boolean} - True if objects are identical, false otherwise
 */
function compareWeekAndDayOfMonth(obj1, obj2) {
	// Handle null/undefined cases
	if (obj1 === obj2) return true;
	if (!obj1 || !obj2) return obj1 === obj2;
	
	// Compare dayOfWeek and weekOfMonth properties
	return obj1.dayOfWeek === obj2.dayOfWeek && obj1.weekOfMonth === obj2.weekOfMonth;
}

module.exports = {
	generateOccurrences,
	compareTwoRecurrence
};
