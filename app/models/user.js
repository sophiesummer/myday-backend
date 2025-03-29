const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
	name: { type: String, required: true },
	email: { type: String, required: true, unique: true },
	firebaseUid: { type: String, required: true, unique: true },
	profilePicture: { type: String },
	createdAt: { type: Number, default: () => Date.now() },
	lastLogin: { type: Number },
	active: { type: Boolean, default: true },
	// User preferences and settings
	preferences: {
		theme: { type: String, default: 'light' },
		notifications: { type: Boolean, default: true }
	}
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
