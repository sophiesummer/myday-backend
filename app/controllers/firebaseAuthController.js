const User = require('../models/user');

// Sync user data with the backend after Firebase authentication
exports.syncUserData = async (req, res) => {
  try {
    // Firebase authentication is handled by middleware
    // At this point, req.user is already populated with the user from our database
    
    const user = req.user;
    
    // Return the user data and any additional information needed by frontend
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        preferences: user.preferences
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false, 
      error: error.message
    });
  }
};

// Update user profile or preferences
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, preferences } = req.body;
    const updatedFields = {};
    
    // Only update fields that are provided
    if (name) updatedFields.name = name;
    if (preferences) updatedFields.preferences = preferences;
    
    // Update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updatedFields },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        preferences: user.preferences
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}; 