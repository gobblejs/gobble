module.exports = function moveTo ( inputDir, outputDir, options, callback, errback ) {
	var sander = require( 'sander' );
	sander.copydir( inputDir ).to( outputDir, options.dest ).then( callback, errback );
};
