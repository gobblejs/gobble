'use strict';

var path = require('path');
var sander = require('sander');
var symlink_or_copy = require('symlink-or-copy');

exports['default'] = function (srcPath, destPath) {
	sander.mkdirSync(path.dirname(srcPath));
	sander.mkdirSync(path.dirname(destPath));

	symlink_or_copy.sync(srcPath, destPath);
};