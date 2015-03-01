'use strict';

var sander = require('sander');



exports['default'] = cleanup;
function cleanup(dir) {
	return sander.mkdir(dir).then(function () {
		return sander.readdir(dir).then(function (files) {
			var promises = files.map(function (filename) {
				return sander.rimraf(dir, filename);
			});
			return sander.Promise.all(promises);
		});
	});
}