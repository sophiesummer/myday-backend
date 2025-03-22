const express = require('express');
const cors = require("cors");
const connectDB = require('./app/config/db.js');
const taskRoutes = require('./app/routes/taskRoutes');
const userRoutes = require('./app/routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

var corsOptions = {
	origin: "http://localhost:8080"
};

connectDB();

app.use(cors(corsOptions));

// Middleware
// parse requests of content-type - application/json
app.use(express.json()); // To parse JSON payloads

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);


// Start Server
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
