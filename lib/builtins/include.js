var fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	Promise = require( 'promo' ).Promise,
	symlink = require( '../file/symlink' ),
	file = require( '../file' );

module.exports = function include ( inputDir, outputDir, options, callback, errback ) {

	var numPatterns = options.patterns.length;

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
				var stats, filepath, destpath, include;

				filepath = dir + path.sep + filename;
				include = matches( filepath.replace( inputDir + path.sep, '' ) );

				if ( options.exclude && include || !options.exclude && !include ) {
					return check();
				}

				destpath = filepath.replace( inputDir, outputDir );

				fs.stat( filepath, function ( err, stats ) {
					if ( err ) return cb( err );

					if ( stats.isDirectory() ) {
						fs.mkdirSync( destpath );
						processDir( filepath, handleResult );
					} else {
						fs.symlink( filepath, destpath, handleResult );
					}
				});
			});

			function handleResult ( err ) {
				if ( err ) return cb( err );
				check();
			}
		});
	}

	function matches ( filename ) {
		var i = numPatterns;
		while ( i-- ) {
			if ( options.patterns[i].test( filename ) ) {
				return true;
			}
		}

		return false;
	}

	processDir( inputDir, function ( err ) {
		if ( err ) return errback( err );
		callback();
	});
};
