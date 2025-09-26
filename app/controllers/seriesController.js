const Series = require('../models/series');
const { getCurrentUser } = require('../middleware/firebaseAuth');
const mongoose = require('mongoose');

const SERIES_MUTABLE_FIELDS = new Set([
  'title',
  'description',
  'recurrence',
  'goalId',
  'tagIds',
  'firstOccurrenceAt',
  'lastOccurrenceAt',
  'color',
  'active',
  'priority',
]);

const sanitizeSeriesInput = (input = {}) => {
  return Object.entries(input).reduce((acc, [key, value]) => {
    if (value === undefined) {
      return acc;
    }
    if (SERIES_MUTABLE_FIELDS.has(key)) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

// Create a new series
exports.createSeries = async (req, res) => {
  try {
    const user = getCurrentUser();
    const payload = sanitizeSeriesInput(req.body);

    const series = new Series({
      ...payload,
      userId: user._id,
    });

    await series.save();
    res.status(201).json(series);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all series for the authenticated user
exports.getUserSeries = async (_req, res) => {
  try {
    const user = getCurrentUser();
    const series = await Series.find({ userId: user._id });

    res.status(200).json(series);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Query series for authenticated user
exports.querySeries = async (req, res) => {
  try {
    const user = getCurrentUser();

    let query = {};
    if (req.query.q) {
      try {
        query = JSON.parse(req.query.q);
      } catch (parseError) {
        return res.status(400).json({ error: 'Invalid query JSON' });
      }
    }

    query.userId = user._id;

    const series = await Series.find(query);

    res.status(200).json(series);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a series by ID (only if owned by the authenticated user)
exports.getSeriesById = async (req, res) => {
  try {
    const user = getCurrentUser();

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid series ID' });
    }

    const series = await Series.findOne({
      _id: req.params.id,
      userId: user._id,
    });

    if (!series) {
      return res.status(404).json({ message: 'Series not found or not authorized' });
    }

    res.status(200).json(series);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a series by ID (only if owned by the authenticated user)
exports.updateSeriesById = async (req, res) => {
  try {
    const user = getCurrentUser();

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid series ID' });
    }

    const updatePayload = sanitizeSeriesInput(req.body);

    const series = await Series.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: user._id,
      },
      updatePayload,
      {
        new: true,
        runValidators: true,
        omitUndefined: true,
      }
    );

    if (!series) {
      return res.status(404).json({ message: 'Series not found or not authorized' });
    }

    res.status(200).json(series);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a series by ID (only if owned by the authenticated user)
exports.deleteSeriesById = async (req, res) => {
  try {
    const user = getCurrentUser();

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid series ID' });
    }

    const series = await Series.findOneAndDelete({
      _id: req.params.id,
      userId: user._id,
    });

    if (!series) {
      return res.status(404).json({ message: 'Series not found or not authorized' });
    }

    res.status(200).json({ message: 'Series deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

