const rateLimit = require('express-rate-limit');

// 30 requests per minute per user (or IP)
const perMinuteRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip
});

const perFifteenMinuteRateLimit = rateLimit({
  windowMs: 60 * 15 * 1000,
  max: 200,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip
});

// 800 requests per hour per user (or IP)
const perHourRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 800,
  message: 'Hourly request limit exceeded, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip
});

// 1200 requests per 15 minutes per route (regardless of user)
const perRouteLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  message: 'Too many requests to this URL, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.baseUrl + req.path
});

module.exports = {
  perMinuteRateLimit,
  perFifteenMinuteRateLimit,
  perHourRateLimit,
  perRouteLimit
};
