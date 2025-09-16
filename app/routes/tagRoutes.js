const express = require('express');
const {
 createTag,
 getUserTags,
 queryTags,
 getTagById,
 updateTagById,
 deleteTagById
} = require('../controllers/tagController');
const { verifyFirebaseToken } = require('../middleware/firebaseAuth');


const router = express.Router();


// All routes require Firebase authentication
router.use(verifyFirebaseToken);


// Get all tags for the authenticated user
router.get('/user', getUserTags);


// Query tags with filter (only shows authenticated user's tags)
router.get('/', queryTags);


// Get a specific tag by ID (only if owned by authenticated user)
router.get('/:id', getTagById);


// Create a new tag (automatically assigned to authenticated user)
router.post('/', createTag);


// Update a tag by ID (only if owned by authenticated user)
router.put('/:id', updateTagById);


// Delete a tag by ID (only if owned by authenticated user)
router.delete('/:id', deleteTagById);


module.exports = router;

