const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
	name: { type: String, required: true },
	email: { type: String, required: true, unique: true },
	password: { type: String }, // Not required as Google auth users won't have a password
	googleId: { type: String },
	profilePicture: { type: String },
	refreshToken: { type: String },
	createdAt: { type: Number, default: () => Date.now() },
	lastLogin: { type: Number },
	active: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure a user has either a password or a googleId
UserSchema.pre('save', function(next) {
	if (!this.password && !this.googleId) {
		next(new Error('User must have either a password or a Google ID'));
	} else {
		next();
	}
});

module.exports = mongoose.model('User', UserSchema);
