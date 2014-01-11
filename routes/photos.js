var Photo = require('../models/Photo')
var path = require('path');
var fs = require('fs');
var join = path.join;
var Busboy = require('busboy');
var http = require('http');
var inspect = require('util').inspect;

exports.index = function(req, res){
	Photo.find({}, function(err, photos){
		res.render('photos', {
			title: "All photos",
			photos: photos
		})		
	});
}


exports.form = function(req, res){
	res.render('photos/upload', {
		title: "Upload photos"
	})
}

exports.download = function(dir){
	
	return function(req, res, next){
		var photoId = req.params.id
		Photo.findById(photoId, function(err, photo){
			if (err) return next(err);
			var path = join(dir, photo.path);
			// res.sendfile(path);
			res.download(path, photo.name + '.jpg');
			// res.end('end');
		}
		)
		// 
	}
}

// uses the deprecated multipart middleware
exports.submit1 = function(dir){
	return function(req, res, next){
		var img = req.files.photo.image; 
		var photoName = req.body.photo.name || img.name;
		var path = join(dir, img.name);

		fs.rename(img.path, path, function(err){
			if (err) return next(err);
			Photo.create({
				name: photoName,
				path: img.name				
				}, function(err){
					if (err) return next(err);
					res.redirect('/');
				}
			)
		})
	}
}

// uses busboy to only log
exports.submit2 = function(dir){
	return function(req, res, next){

		var busboy = new Busboy({ headers: req.headers });
		busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {

			console.log('File [' + fieldname +']: filename: ' + filename + ', encoding: ' + encoding);

			file.on('data', function(data) {
				console.log('File [' + fieldname +'] got ' + data.length + ' bytes');
		  	});

			file.on('end', function() {
				console.log('File [' + fieldname +'] Finished');
			});
		});

		busboy.on('field', function(fieldname, val, valTruncated, keyTruncated) {
			console.log('Field [' + fieldname + ']: value: ' + inspect(val));
		});

		busboy.on('end', function() {
		  console.log('Done parsing form!');
		  res.writeHead(303, { Connection: 'close', Location: '/' });
		  res.end();
		});

		req.pipe(busboy);
	
	}
}

// uses busboy, can transfer several files but don't put them in db
exports.submit3 = function(dir){
	return function(req, res, next){

		var infiles = 0;
		var outfiles = 0;
		var done = false;

		// busboy is a writable strean
		var busboy = new Busboy({ headers: req.headers });

    	console.log('Start parsing form ...');	

		busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
			++infiles;
			console.log('File [' + fieldname +']: filename: ' + filename + ', encoding: ' + encoding);

			onFile3(fieldname, file, filename, dir, function(){
				++outfiles;
				if (done) {
					console.log(outfiles + '/' + infiles + ' parts written to disk');
				}
				if (done && infiles === outfiles){
					console.log('all parts written to disk');
					res.writeHead('200', {'Connection' : 'close'});
					res.end('end');
				}
			})


		});

		busboy.on('field', function(fieldname, val, valTruncated, keyTruncated) {
			console.log('Field [' + fieldname + ']: value: ' + inspect(val));
		});

		busboy.on('end', function() {
			console.log('Done parsing form!');
			done = true;
		});

		// rappel: req is a readable stream
		req.pipe(busboy);
	
	}
}

// used by submit3 
function onFile3(fieldname, file, filename, dir, next) {
  // or save at some other location
  var fstream = fs.createWriteStream(path.join(dir, path.basename(filename)));
  file.on('end', function() {
    console.log(fieldname + '(' + filename + ') EOF');
  });
  fstream.on('close', function() {
    console.log(fieldname + '(' + filename + ') written to disk');
    next();
  });
  console.log(fieldname + '(' + filename + ') start saving');
  file.pipe(fstream);
}

// uses busboy, can transfer only 1 file
exports.submit = function(dir){
	return function(req, res, next){
		var done = false;
		var fileInfo = {};
		var busboy = new Busboy({ headers: req.headers }); // writable strean

		busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {

			console.log('File [' + fieldname +']: filename: ' + filename + ', encoding: ' + encoding);
			onFile(fieldname, file, filename, dir, function(){
				if (done) {
					recordFile(filename, fileInfo, dir, function(err){
						if (err) return next(err);
						res.redirect('/');
					});
				}
			})
		});

		busboy.on('field', function(fieldname, val, valTruncated, keyTruncated) {
			console.log('Field [' + fieldname + ']: value: ' + inspect(val));
			if (fieldname === "photo[name]") fileInfo['name'] = val
		});

		busboy.on('end', function() {
			console.log('Done parsing form!');
			done = true;
		});

		// rappel: req is a readable stream
		req.pipe(busboy);
		console.log('Start parsing form ...');	
	
	}
}

function onFile (fieldname, file, filename, dir, next){
	var fstream = fs.createWriteStream(path.join(dir, path.basename(filename)));
	
	fstream.on('close', function() {
		console.log(fieldname + '(' + filename + ') written to disk');
		next();
	});
	file.pipe(fstream);
}

function recordFile(filename, fileInfo, dir, next){
	var photoName = fileInfo.name || filename;	
	Photo.create({
		name: photoName,
		path: filename				
		}, next
	)
}


