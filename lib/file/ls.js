var path = require( 'path' ),
	fs = require( 'fs' ),
	Promise = require( 'promo' ).Promise;

module.exports = function () {
	var dir = path.resolve.apply( path, arguments ), result = [];

	function processDir ( dir ) {
		fs.readdirSync( dir ).forEach( function ( filename ) {
			var stats, filepath;

			filepath = dir + path.sep + filename;

			stats = fs.statSync( filepath );

			if ( stats.isDirectory() ) {
				processDir( filepath );
			} else {
				result.push( filepath );
			}
		});
	}

	processDir( dir );

	return new Promise( function ( fulfil ) {
		result = result.map( function ( filename ) {
			return filename.substring( dir.length + 1 );
		});

		fulfil( result );
	});
};
