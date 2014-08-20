module.exports = function moveTo ( inputDir, outputDir, options, done ) {
	var copydir, dest;

	copydir = require( '../file/copydir' );
	dest = require( 'path' ).resolve( outputDir, options.dest );

	copydir( inputDir ).to( dest ).then( done, done );
};
