const express = require('express');
const { createTask, getAllTasks } = require('../controllers/taskController');

const router = express.Router();

router.post('/', createTask);
router.get('/', getAllTasks);

module.exports = router;
