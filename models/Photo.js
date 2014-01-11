var mongoose = require('mongoose');

if (process.env.MONGOHQ_URL ){
	mongoose.connect(process.env.MONGOHQ_URL);
} else {
	mongoose.connect('mongodb://localhost/photo_app_db');	
}



var schema = new mongoose.Schema({
	name: String,
	path: String
});

module.exports = mongoose.model('Photo', schema);