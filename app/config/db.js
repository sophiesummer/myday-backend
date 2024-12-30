

const mongoose = require('mongoose');

const connectDB = async () => {
	try {
		await mongoose.connect('mongodb+srv://Cluster47047:UmlUQ0VUel99@cluster47047.fzz38.mongodb.net/development', {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		console.log('Connected to the database!');
	} catch (error) {
		console.error('MongoDB connection error:', error.message);
		process.exit(1); // Exit process with failure
	}
};

module.exports = connectDB;
