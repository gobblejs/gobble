module.exports = function moveTo ( inputDir, outputDir, options, callback, errback ) {
	var merge = require( '../file/merge' );
	merge( inputDir ).to( outputDir, options.dest ).then( callback, errback );
};
