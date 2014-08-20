module.exports = function grab ( inputDir, outputDir, options, done ) {
	var copydir, src;

	copydir = require( '../file/copydir' );
	src = require( 'path' ).resolve( inputDir, options.src );

	copydir( src ).to( outputDir ).then( done, done );
};
