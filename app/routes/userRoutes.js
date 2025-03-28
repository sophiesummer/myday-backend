const express = require('express');
const { 
    registerUser, 
    loginUser, 
    googleLogin, 
    getCurrentUser, 
    getAllUsers 
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLogin);

// Protected routes
router.get('/me', protect, getCurrentUser);
router.get('/', protect, getAllUsers); // In a real app this would likely be admin-only

module.exports = router;
