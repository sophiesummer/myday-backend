const admin = require('firebase-admin');
const User = require('../models/user');
const { AsyncLocalStorage } = require('async_hooks');

// Create AsyncLocalStorage instance to store user context
const userContextStorage = new AsyncLocalStorage();

// Export the userContextStorage to be used in other files
exports.userContextStorage = userContextStorage;

// Helper function to get current user from context
exports.getCurrentUser = () => {
  const store = userContextStorage.getStore();
  if (!store) {
    throw new Error('No user context found. Make sure this is called within an authenticated route.');
  }
  return store.user;
};

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    console.log('Initializing Firebase Admin SDK with:', {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKeyExists: !!process.env.FIREBASE_PRIVATE_KEY
    });

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
}

// Middleware to verify Firebase token
exports.verifyFirebaseToken = async (req, res, next) => {
  try {
    console.log('Starting Firebase token verification');

    // Check if Authorization header exists
    if (!req.headers.authorization) {
      console.log('No Authorization header found');
      return res.status(401).json({
        success: false,
        message: 'No Authorization header found'
      });
    }

    // Extract the token
    const token = req.headers.authorization.split('Bearer ')[1];

    if (!token) {
      console.log('No token found in Authorization header');
      return res.status(401).json({
        success: false,
        message: 'No token found in Authorization header'
      });
    }

    console.log('Token found, verifying with Firebase');

    // Verify the token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('Token verified successfully, decoded info:', {
      uid: decodedToken.uid,
      email: decodedToken.email
    });

    const { uid, email, name, picture } = decodedToken;

    // Check if user exists in our database by firebaseUid OR email
    console.log('Looking for user with firebaseUid:', uid, 'or email:', email);
    let user = await User.findOne({ 
      $or: [
        { firebaseUid: uid },
        { email: email }
      ]
    });

    if (!user) {
      console.log('User not found in database, creating new user');
      // Create new user if not found
      user = new User({
        firebaseUid: uid,
        email: email,
        name: name || email.split('@')[0], // Use part of email as name if not provided
        profilePicture: picture,
        lastLogin: Date.now()
      });
      await user.save();
      console.log('New user created with ID:', user._id);
    } else {
      console.log('User found in database, ID:', user._id);
      
      // If user exists but with different firebaseUid, update it
      if (user.firebaseUid !== uid) {
        console.log('Updating existing user with new firebaseUid');
        user.firebaseUid = uid;
      }
      
      // Update other fields if they've changed
      if (name && user.name !== name) {
        user.name = name;
      }
      if (picture && user.profilePicture !== picture) {
        user.profilePicture = picture;
      }
      
      // Update last login time
      user.lastLogin = Date.now();
      await user.save();
    }

    // Attach user to request (keeping for backward compatibility)
    req.user = user;
    
    // Run the next middleware within a user context
    userContextStorage.run({ user }, () => {
      console.log('Auth successful, proceeding to next middleware');
      next();
    });
  } catch (error) {
    console.error('Firebase authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token or authorization failed',
      error: error.message
    });
  }
};
