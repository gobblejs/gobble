'use strict';

var path = require('path');
var sander = require('sander');
var minimatch = require('minimatch');
var symlink_or_copy = require('symlink-or-copy');



exports['default'] = include;
function include(inputdir, outputdir, options) {
	var numPatterns = options.patterns.length;

	return sander.lsr(inputdir).then(function (files) {
		return files.filter(function (file) {
			var isIncluded = matches(file);
			return options.exclude ? !isIncluded : isIncluded;
		});
	}).then(function (files) {
		var promises = files.map(function (file) {
			return sander.mkdir(outputdir, path.dirname(file)).then(function () {
				var src = inputdir + path.sep + file;
				var dest = outputdir + path.sep + file;

				// TODO sander-esque symlinkOrCopy
				symlink_or_copy.sync(src, dest);
			});
		});

		return sander.Promise.all(promises);
	});

	function matches(filename) {
		var i = numPatterns;
		while (i--) {
			if (minimatch(filename, options.patterns[i])) {
				return true;
			}
		}

		return false;
	}
}