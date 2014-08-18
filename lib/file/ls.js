var fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	Promise = require( 'promo' ).Promise,
	readdir = require( './readdir' ),
	stat = require( './stat' );

module.exports = function () {
	var dir = path.resolve.apply( path, arguments ), result = [];

	function processDir ( dir ) {
		return readdir( dir ).then( function ( files ) {
			var promises = files.map( function ( filename ) {
				var filepath = path.resolve( dir, filename );

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
		return result.map( function ( filename ) {
			return path.relative( dir, filename );
		});
	});
};
