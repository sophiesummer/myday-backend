const User = require('../models/user');
const bcrypt = require('bcrypt');

// Create a new user
exports.registerUser = async (req, res) => {
	try {
		const { name, email, password } = req.body;

		// Hash the password
		const hashedPassword = await bcrypt.hash(password, 10);

		const user = new User({ name, email, password: hashedPassword });
		await user.save();
		res.status(201).json(user);
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

// Get all users
exports.getAllUsers = async (req, res) => {
	try {
		const users = await User.find();
		res.status(200).json(users);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};
