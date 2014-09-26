module.exports = function grab ( inputDir, outputDir, options, callback, errback ) {
	var sander = require( 'sander' );
	sander.copydir( inputDir, options.src ).to( outputDir ).then( callback, errback );
};
