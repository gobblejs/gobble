var path = require( 'path' ),
	minimatch = require( 'minimatch' ),
	Promise = require( 'promo' ).Promise,
	file = require( '../file' );

module.exports = function include ( srcDir, destDir, options, done ) {
	file.ls( srcDir ).then( function ( files ) {
		files = files.filter( function ( filename ) {
			return !minimatch( filename, options.pattern );
		});

		promises = files.map( function ( filename ) {
			return file.copy( path.join( srcDir, filename ), path.join( destDir, filename ) );
		});

		Promise.all( promises ).then( function () {
			done();
		});
	});
};
