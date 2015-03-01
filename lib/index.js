'use strict';

var path = require('path');
var sander = require('sander');
var getNode = require('./utils/getNode');
var config = require('./config');

var gobble = function (inputs, options) {
	return getNode['default'](inputs, options);
};

gobble.env = function (env) {
	if (arguments.length) {
		config['default'].env = env;
	}

	return config['default'].env;
};

gobble.cwd = function () {
	if (arguments.length) {
		config['default'].cwd = path.resolve.apply(null, arguments);
	}

	return config['default'].cwd;
};

gobble.sander = sander;

exports['default'] = gobble;