'use strict';

var path = require('path');
var sander = require('sander');
var symlink = require('./symlink');

exports['default'] = function () {
	var src = path.resolve.apply(null, arguments);

	return {
		to: function to() {
			var dest = path.resolve.apply(null, arguments);

			return _merge(src, dest);
		}
	};
};

function _merge(src, dest) {
	return sander.stat(dest).then(function (stats) {
		if (stats.isDirectory()) {
			// If it's a symlinked dir, we need to convert it to a real dir.
			// Suppose linked-foo/ is a symlink of foo/, and we try to copy
			// the contents of bar/ into linked-foo/ - those files will end
			// up in foo, which is definitely not what we want
			return sander.lstat(dest).then(function (stats) {
				if (stats.isSymbolicLink()) {
					convertToRealDir(dest);
				}

				return sander.readdir(src).then(function (files) {
					var promises = files.map(function (filename) {
						return _merge(src + path.sep + filename, dest + path.sep + filename);
					});

					return sander.Promise.all(promises);
				});
			});
		}

		// exists, and is file - overwrite
		return sander.unlink(dest).then(link);
	}, link); // <- failed to stat, means dest doesn't exist

	function link() {
		symlink['default'](src, dest);
	}
}

function convertToRealDir(symlinkPath) {
	var originalPath = sander.realpathSync(symlinkPath);

	sander.unlinkSync(symlinkPath);
	sander.mkdirSync(symlinkPath);

	sander.readdirSync(originalPath).forEach(function (filename) {
		sander.symlinkSync(originalPath + path.sep + filename, symlinkPath + path.sep + filename);
	});
}