// Recurrence utility functions for generating task occurrences

function generateOccurrences({ startTime, endTime, recurrence }) {
	// TODO: Implement occurrence generation logic
	// This function should generate an array of timestamps based on the recurrence pattern
	// Parameters:
	// - startTime: base start time for the first occurrence
	// - endTime: base end time (used to calculate duration)
	// - recurrence: recurrence configuration object with frequency, interval, etc.
	// Safety limits
  const MAX_OCCURRENCES = 400;

  const frequency = recurrence?.frequency || 'daily';
  const interval = Math.max(1, Number(recurrence?.interval || 1));
  const startMs = normalizeStart({ startTime, recurrence });
  const endBy = typeof recurrence?.endDate === 'number' ? recurrence.endDate : undefined;
  const countLimit = typeof recurrence?.count === 'number' && recurrence.count > 0 ? recurrence.count : undefined;

  const results = [];
  let current = startMs;

  while (true) {
    if (countLimit && results.length >= countLimit) break;
    if (endBy && current > endBy) break;
    if (results.length >= MAX_OCCURRENCES) break;

    // Align for weekly/dayOfWeek if provided only on the first iteration
    if (results.length === 0 && frequency === 'weekly' && typeof recurrence?.dayOfWeek === 'number') {
      current = alignToDayOfWeek(current, recurrence.dayOfWeek);
    }

    // Align for monthly if specific day provided
    if (results.length === 0 && frequency === 'monthly') {
      if (typeof recurrence?.dayOfMonth === 'number') {
        current = setDayOfMonth(current, recurrence.dayOfMonth);
      }
    }

    results.push(current);

    // Advance
    if (frequency === 'daily') {
      current = addDays(current, interval);
    } else if (frequency === 'weekly') {
      current = addDays(current, 7 * interval);
    } else if (frequency === 'monthly') {
      current = addMonthsPreserveDay(current, interval, recurrence?.dayOfMonth);
    } else if (frequency === 'yearly') {
      current = addYearsPreserveDay(current, interval);
    } else {
      // Fallback to daily
      current = addDays(current, interval);
    }
  }

  return results;
}

function normalizeStart({ startTime, recurrence }) {
	if (typeof recurrence?.startDate === 'number') return recurrence.startDate;
	if (typeof startTime === 'number') return startTime;
	return Date.now();
}

function addDays(ts, days) {
	return ts + days * 24 * 60 * 60 * 1000;
}

function alignToDayOfWeek(ts, targetDow) {
	const d = new Date(ts);
	const currentDow = d.getUTCDay();
	let diff = targetDow - currentDow;
	if (diff < 0) diff += 7;
	return addDays(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), diff);
}

function setDayOfMonth(ts, day) {
	const d = new Date(ts);
	const y = d.getUTCFullYear();
	const m = d.getUTCMonth();
	const maxDay = daysInMonthUtc(y, m);
	const clamped = Math.min(Math.max(1, day), maxDay);
	return Date.UTC(y, m, clamped, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
}

function addMonthsPreserveDay(ts, monthsToAdd, desiredDay) {
	const d = new Date(ts);
	let y = d.getUTCFullYear();
	let m = d.getUTCMonth() + monthsToAdd;
	y += Math.floor(m / 12);
	m = ((m % 12) + 12) % 12;
	const day = typeof desiredDay === 'number' ? desiredDay : d.getUTCDate();
	const maxDay = daysInMonthUtc(y, m);
	const clamped = Math.min(Math.max(1, day), maxDay);
	return Date.UTC(y, m, clamped, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
}

function addYearsPreserveDay(ts, yearsToAdd) {
	const d = new Date(ts);
	const y = d.getUTCFullYear() + yearsToAdd;
	const m = d.getUTCMonth();
	const day = d.getUTCDate();
	const maxDay = daysInMonthUtc(y, m);
	const clamped = Math.min(day, maxDay);
	return Date.UTC(y, m, clamped, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
}

function daysInMonthUtc(year, monthZeroBased) {
	return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
}

module.exports = {
	generateOccurrences,
	normalizeStart,
	addDays,
	alignToDayOfWeek,
	setDayOfMonth,
	addMonthsPreserveDay,
	addYearsPreserveDay,
	daysInMonthUtc
};
