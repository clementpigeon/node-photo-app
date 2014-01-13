var Photo = require('../models/Photo')
var path = require('path');
var fs = require('fs');
var join = path.join;
var Busboy = require('busboy');
var http = require('http');
var inspect = require('util').inspect;
var Uploader = require('s3-streaming-upload').Uploader;


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


exports.submit = function(dir){
	return function(req, res, next){
		var done = false;
		var fileInfo = {};
		var busboy = new Busboy({ headers: req.headers }); // writable strean

		busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {

			console.log('File [' + fieldname +']: filename: ' + filename + ', encoding: ' + encoding);
			onFileS3(fieldname, file, filename, dir, function(){
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


// move aws credentials to env vars
// and renew credentials in next iteration !

function onFileS3 (fieldname, file, filename, dir, next){
  var upload = new Uploader({
    // credentials to access AWS
    accessKey:  "AKIAIBLVG3AH4U2ZLOGA", 
    secretKey:  "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", 
    bucket:     'cp-photo-app',
    objectName: filename,
    stream:     file
  });

  upload.on('completed', function (err, res) {
      console.log('upload completed');
      next();
  });

  upload.on('failed', function (err) {
      console.log('upload failed with error', err);
      next(err);
  });
}


function recordFile(filename, fileInfo, dir, next){
	var photoName = fileInfo.name || filename;	
	Photo.create({
		name: photoName,
		path: filename				
		}, next
	)
}

