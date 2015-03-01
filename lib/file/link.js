'use strict';

var path = require('path');
var sander = require('sander');
var symlink_or_copy = require('symlink-or-copy');

exports['default'] = function () {
	var src = path.resolve.apply(null, arguments);

	return {
		to: function to() {
			var dest = path.resolve.apply(null, arguments);

			return sander.mkdir(path.dirname(dest)).then(function () {
				symlink_or_copy.sync(src, dest);
			});
		}
	};
};