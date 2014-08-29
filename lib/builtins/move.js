module.exports = function moveTo ( inputDir, outputDir, options, callback, errback ) {
	var copydir, dest;

	copydir = require( '../file/copydir' );
	dest = require( 'path' ).resolve( outputDir, options.dest );

	copydir( inputDir ).to( dest ).then( callback, errback );
};
