var fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	Promise = require( 'promo' ).Promise,
	readdir = require( './readdir' ),
	stat = require( './stat' ),
	debug = require( '../utils/debug' );

module.exports = function () {
	var dir = path.join.apply( path, arguments ), result = [];

	function processDir ( dir ) {
		return readdir( dir ).then( function ( files ) {
			var promises = files.map( function ( file ) {
				var filepath = path.join( dir, file );

				return stat( filepath ).then( function ( stats ) {
					if ( stats.isDirectory() ) {
						return processDir( filepath );
					}

					result.push( filepath );
				});
			});

			return Promise.all( promises );
		});
	}

	return processDir( dir ).then( function () {
		return result.map( function ( file ) {
			return path.relative( dir, file );
		});
	});
};
