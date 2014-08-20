var path = require( 'path' ),
	crc32 = require( 'buffer-crc32' ),
	Promise = require( 'promo' ).Promise,
	file = require( '../file' );

module.exports = function map ( srcDir, destDir, options, done ) {
	var oldCrc = options.crc, newCrc = options.crc = {};

	file.ls( srcDir ).then( function ( files ) {
		var promises = files.map( function ( filename ) {
			var ext = path.extname( filename );

			// If this mapper only accepts certain extensions, and this isn't
			// one of them, bug out
			if ( options.accept && !~options.accept.indexOf( ext ) ) {
				return;
			}

			return file.stat( srcDir, filename ).then( function ( stats ) {
				if ( stats.isDirectory() ) {
					return;
				}

				return file.read( srcDir, filename ).then( function ( data ) {
					var result, crc;

					// If the file contents haven't changed, we have nothing to do
					crc = newCrc[ filename ] = crc32( data );
					if ( oldCrc[ filename ] && compareBuffers( crc, oldCrc[ filename ] ) ) {
						return;
					}

					result = options.fn( data.toString(), options.options );

					if ( options.ext ) {
						filename = filename.substr( 0, filename.length - ext.length ) + options.ext;
					}

					return file.write( destDir, filename, result );
				});
			});
		});

		return Promise.all( promises ).then( function () {
			done();
		}, done );
	});
};

function compareBuffers ( a, b ) {
	var i = a.length;

	if ( b.length !== i ) {
		return false;
	}

	while ( i-- ) {
		if ( a[i] !== b[i] ) {
			return false;
		}
	}

	return true;
}
