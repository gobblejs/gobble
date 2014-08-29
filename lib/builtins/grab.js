module.exports = function grab ( inputDir, outputDir, options, callback, errback ) {
	var copydir, src;

	copydir = require( '../file/copydir' );
	src = require( 'path' ).resolve( inputDir, options.src );

	copydir( src ).to( outputDir ).then( callback, errback );
};
