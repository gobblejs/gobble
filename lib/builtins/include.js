var path = require( 'path' ),
	minimatch = require( 'minimatch' ),
	Promise = require( 'promo' ).Promise,
	helpers = require( '../helpers' );

module.exports = function include ( srcDir, destDir, options, done ) {
	helpers.ls( srcDir ).then( function ( files ) {
		files = files.filter( function ( file ) {
			return minimatch( file, options.pattern );
		});

		promises = files.map( function ( file ) {
			return helpers.copy( path.join( srcDir, file ), path.join( destDir, file ) );
		});

		Promise.all( promises ).then( function () {
			done();
		});
	});
};
