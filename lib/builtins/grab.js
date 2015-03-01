'use strict';

var merge = require('../file/merge');



exports['default'] = grab;
function grab(inputdir, outputdir, options) {
	return merge['default'](inputdir, options.src).to(outputdir);
}