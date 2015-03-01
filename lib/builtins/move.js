'use strict';

var merge = require('../file/merge');



exports['default'] = moveTo;
function moveTo(inputdir, outputdir, options) {
	return merge['default'](inputdir).to(outputdir, options.dest);
}