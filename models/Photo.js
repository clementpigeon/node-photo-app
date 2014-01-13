var mongoose = require('mongoose');

var mongoUri = process.env.MONGOHQ_URL || 'mongodb://localhost/photo_app_db'

mongoose.connect(mongoUri);

var schema = new mongoose.Schema({
	name: String,
	path: String
});

module.exports = mongoose.model('Photo', schema);