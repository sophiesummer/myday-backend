const express = require('express');
const {
	createTask,
	getUserTasks,
	queryTasks,
	getTaskById,
	updateTaskById,
	deleteTaskById,
	getTaskSeries
} = require('../controllers/taskController');
const { verifyFirebaseToken } = require('../middleware/firebaseAuth');

const router = express.Router();

// All routes require Firebase authentication
router.use(verifyFirebaseToken);

// Get all tasks for the authenticated user
router.get('/user', getUserTasks);

// Query tasks with filter (only shows authenticated user's tasks)
router.get('/', queryTasks);

// Get a specific task by ID (only if owned by authenticated user)
router.get('/:id', getTaskById);

// Get series information for a task (only if owned by authenticated user)
router.get('/:id/series', getTaskSeries);

// Create a new task (automatically assigned to authenticated user)
router.post('/', createTask);

// Update a task by ID (only if owned by authenticated user)
router.put('/:id', updateTaskById);

// Delete a task by ID (only if owned by authenticated user)
router.delete('/:id', deleteTaskById);

module.exports = router;
