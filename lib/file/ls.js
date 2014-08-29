var path = require( 'path' ),
	fs = require( 'graceful-fs' ),
	Promise = require( 'promo' ).Promise;

module.exports = function () {
	var dir = path.resolve.apply( path, arguments ), result = [];

	function processDir ( dir, cb ) {
		fs.readdir( dir, function ( err, files ) {
			var remaining = files.length, result = [], check;

			if ( err ) return cb( err );

			// Empty dir?
			if ( !remaining ) {
				cb( null, result );
			}

			check = function () {
				if ( !--remaining ) {
					cb( null, result );
				}
			};

			files.forEach( function ( filename ) {
				var stats, filepath;

				filepath = dir + path.sep + filename;

				fs.stat( filepath, function ( err, stats ) {
					if ( err ) return cb( err );

					if ( stats.isDirectory() ) {
						processDir( filepath, function ( err, filepaths ) {
							if ( err ) return cb( err );

							result.push.apply( result, filepaths );
							check();
						});
					} else {
						result.push( filepath );
						check();
					}
				});
			});
		});
	}

	return new Promise( function ( fulfil, reject ) {
		processDir( dir, function ( err, result ) {
			if ( err ) {
				return reject( err );
			}

			result = result.map( function ( filename ) {
				return filename.substring( dir.length + 1 );
			});

			fulfil( result );
		});
	});

	processDir( dir );
};
