module.exports = function grab ( inputDir, outputDir, options, callback, errback ) {
	var merge = require( '../file/merge' );
	merge( inputDir, options.src ).to( outputDir ).then( callback, errback );
};
