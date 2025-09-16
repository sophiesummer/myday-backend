require('dotenv').config();
const express = require('express');
const cors = require("cors");
const connectDB = require('./app/config/db.js');
const taskRoutes = require('./app/routes/taskRoutes');
const userRoutes = require('./app/routes/userRoutes');
const tagRoutes = require('./app/routes/tagRoutes');
const goalRoutes = require('./app/routes/goalRoutes');
const { perMinuteRateLimit, perFifteenMinuteRateLimit, perHourRateLimit, perRouteLimit } = require('./app/middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

var corsOptions = {
	origin: process.env.CLIENT_URL || "http://localhost:8080"
};

// Connect to MongoDB
connectDB();

// CORS middleware
app.use(cors(corsOptions));

// Middleware for parsing request body
app.use(express.json()); // To parse JSON payloads
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all API routes
app.use(perMinuteRateLimit);
app.use(perFifteenMinuteRateLimit);
app.use(perHourRateLimit);
app.use(perRouteLimit);

// API Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/tags', tagRoutes);


// Basic route for API health check
app.get('/', (req, res) => {
	res.json({ message: 'Welcome to the task management API' });
});

// Start Server
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
