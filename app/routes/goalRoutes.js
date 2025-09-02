const express = require('express');
const {
	createGoal,
	getUserGoals,
	queryGoals,
	getGoalById,
	updateGoalById,
	deleteGoalById
} = require('../controllers/goalController');
const { verifyFirebaseToken } = require('../middleware/firebaseAuth');

const router = express.Router();

// All routes require Firebase authentication
router.use(verifyFirebaseToken);

// Get all goals for the authenticated user
router.get('/user', getUserGoals);

// Query goals with filter (only shows authenticated user's goals)
router.get('/', queryGoals);

// Get a specific goal by ID (only if owned by authenticated user)
router.get('/:id', getGoalById);

// Create a new goal (automatically assigned to authenticated user)
router.post('/', createGoal);

// Update a goal by ID (only if owned by authenticated user)
router.put('/:id', updateGoalById);

// Delete a goal by ID (only if owned by authenticated user)
router.delete('/:id', deleteGoalById);

module.exports = router;
