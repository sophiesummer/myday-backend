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

// const db = require("./app/models");
// db.mongoose
// 	.connect(db.url)
// 	.then(() => {
// 		console.log("Connected to the database!");
// 	})
// 	.catch(err => {
// 		console.log("Cannot connect to the database!", err);
// 		process.exit();
// 	});

// Routes
// app.get('/', (req, res) => {
// 	res.send('Welcome to Tasko .Hello, world!');
// });

// require("./app/routes/tasko.routes")(app);

// Start Server
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
