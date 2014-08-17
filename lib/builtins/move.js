module.exports = function moveTo ( inputDir, outputDir, options, done ) {
	var copydir, dest;

	copydir = require( '../file/copydir' );
	dest = require( 'path' ).join( outputDir, options.dest );

	copydir( inputDir, dest ).then( done, done );
};
