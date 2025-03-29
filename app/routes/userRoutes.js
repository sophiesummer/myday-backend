const express = require('express');
const { 
    syncUserData,
    updateUserProfile
} = require('../controllers/firebaseAuthController');
const { verifyFirebaseToken } = require('../middleware/firebaseAuth');

const router = express.Router();

// Firebase auth routes - all protected with Firebase token verification
router.get('/sync', verifyFirebaseToken, syncUserData);
router.put('/profile', verifyFirebaseToken, updateUserProfile);

module.exports = router;
