const express = require('express');
const {
	createTask,
	queryTasks,
	getTaskById,
	updateTaskById,
	deleteTaskById
} = require('../controllers/taskController');

const router = express.Router();

router.get('/', queryTasks);
router.get('/:id', getTaskById);

// Create a new task
router.post('/', createTask);

// Update a task by ID
router.put('/:id', updateTaskById);

// Delete a task by ID
router.delete('/:id', deleteTaskById);

module.exports = router;
