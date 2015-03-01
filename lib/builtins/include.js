'use strict';

var graceful_fs = require('graceful-fs');
var path = require('path');
var sander = require('sander');
var minimatch = require('minimatch');
var symlink_or_copy = require('symlink-or-copy');



exports['default'] = include;
function include(inputdir, outputdir, options, callback) {
	var numPatterns = options.patterns.length;

	function processdir(dir, cb) {
		graceful_fs.readdir(dir, function (err, files) {
			var remaining = files.length,
			    result = [],
			    check;

			if (err) return cb(err);

			// Empty dir?
			if (!remaining) {
				cb(null, result);
			}

			check = function () {
				if (! --remaining) {
					cb(null, result);
				}
			};

			files.forEach(function (filename) {
				var filepath, destpath, include;

				filepath = dir + path.sep + filename;

				include = matches(filepath.replace(inputdir + path.sep, ""));

				destpath = filepath.replace(inputdir, outputdir);

				graceful_fs.stat(filepath, function (err, stats) {
					if (err) return cb(err);

					if (stats.isDirectory()) {
						processdir(filepath, handleResult);
					} else {
						if (options.exclude && include || !options.exclude && !include) {
							return check();
						}

						sander.mkdirSync(path.dirname(destpath));

						try {
							symlink_or_copy.sync(filepath, destpath);
							check();
						} catch (e) {
							cb(e);
						}
					}
				});
			});

			function handleResult(err) {
				if (err) {
					return cb(err);
				}check();
			}
		});
	}

	function matches(filename) {
		var i = numPatterns;
		while (i--) {
			if (minimatch(filename, options.patterns[i])) {
				return true;
			}
		}

		return false;
	}

	processdir(inputdir, callback);
}