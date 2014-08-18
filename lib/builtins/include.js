var path = require( 'path' ),
	minimatch = require( 'minimatch' ),
	Promise = require( 'promo' ).Promise,
	file = require( '../file' );

module.exports = function include ( srcDir, destDir, options, done ) {
	file.ls( srcDir ).then( function ( files ) {
		files = files.filter( function ( filename ) {
			var matches = minimatch( filename, options.pattern );
			return options.exclude ? !matches : matches;
		});

		promises = files.map( function ( filename ) {
			return file.copy( path.resolve( srcDir, filename ), path.resolve( destDir, filename ) );
		});

		Promise.all( promises ).then( function () {
			done();
		});
	});
};
