var minimatch = require( 'minimatch' ),
	Promise = require( 'promo' ).Promise,
	file = require( '../file' );

module.exports = function include ( inputDir, outputDir, options, callback, errback ) {
	file.ls( inputDir ).then( function ( files ) {
		var promises;

		files = files.filter( function ( filename ) {
			var matches = options.patterns.some( function ( pattern ) {
				return minimatch( filename, pattern );
			});

			return options.exclude ? !matches : matches;
		});

		promises = files.map( function ( filename ) {
			return file.copy( inputDir, filename ).to( outputDir, filename );
		});

		return Promise.all( promises );
	}).then( callback, errback );
};
