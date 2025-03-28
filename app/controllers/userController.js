const User = require('../models/user');
const bcrypt = require('bcrypt');
const { generateToken } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Create a new user with email/password
exports.registerUser = async (req, res) => {
	try {
		const { name, email, password } = req.body;

		// Check if user already exists
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({ success: false, message: 'Email already in use' });
		}

		// Hash the password
		const hashedPassword = await bcrypt.hash(password, 10);

		const user = new User({ 
			name, 
			email, 
			password: hashedPassword,
			lastLogin: Date.now()
		});
		
		await user.save();
		
		// Generate JWT token
		const token = generateToken(user._id);
		
		res.status(201).json({
			success: true,
			user: {
				id: user._id,
				name: user.name,
				email: user.email
			},
			token
		});
	} catch (error) {
		res.status(400).json({ success: false, error: error.message });
	}
};

// Login with email and password
exports.loginUser = async (req, res) => {
	try {
		const { email, password } = req.body;
		
		// Validate input
		if (!email || !password) {
			return res.status(400).json({ success: false, message: 'Please provide email and password' });
		}
		
		// Find user by email
		const user = await User.findOne({ email });
		
		// Check if user exists
		if (!user || !user.password) {
			return res.status(401).json({ success: false, message: 'Invalid credentials' });
		}
		
		// Check if password matches
		const isMatch = await bcrypt.compare(password, user.password);
		
		if (!isMatch) {
			return res.status(401).json({ success: false, message: 'Invalid credentials' });
		}
		
		// Update last login
		user.lastLogin = Date.now();
		await user.save();
		
		// Generate JWT token
		const token = generateToken(user._id);
		
		res.status(200).json({
			success: true,
			user: {
				id: user._id,
				name: user.name,
				email: user.email
			},
			token
		});
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

// Google Sign-in
exports.googleLogin = async (req, res) => {
	try {
		const { tokenId } = req.body;
		
		// Verify Google token
		const ticket = await googleClient.verifyIdToken({
			idToken: tokenId,
			audience: process.env.GOOGLE_CLIENT_ID
		});
		
		const { name, email, picture, sub } = ticket.getPayload();
		
		// Check if user exists
		let user = await User.findOne({ email });
		
		if (user) {
			// Update Google ID if it doesn't exist
			if (!user.googleId) {
				user.googleId = sub;
				user.profilePicture = picture;
			}
			user.lastLogin = Date.now();
			await user.save();
		} else {
			// Create new user
			user = new User({
				name,
				email,
				googleId: sub,
				profilePicture: picture,
				lastLogin: Date.now()
			});
			await user.save();
		}
		
		// Generate JWT token
		const token = generateToken(user._id);
		
		res.status(200).json({
			success: true,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				profilePicture: user.profilePicture
			},
			token
		});
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

// Get current user profile
exports.getCurrentUser = async (req, res) => {
	try {
		const user = await User.findById(req.user._id).select('-password -refreshToken');
		
		if (!user) {
			return res.status(404).json({ success: false, message: 'User not found' });
		}
		
		res.status(200).json({
			success: true,
			user
		});
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

// Get all users (admin only in a real app)
exports.getAllUsers = async (req, res) => {
	try {
		const users = await User.find().select('-password -refreshToken');
		res.status(200).json({
			success: true,
			count: users.length,
			users
		});
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};
