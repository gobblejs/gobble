'use strict';

var path = require('path');
var chalk = require('chalk');
var nodes = require('../nodes');
var config = require('../config');
var is = require('./is');

var sources = {};

exports['default'] = getNode;

function getNode(input, options) {
	if (input._gobble) {
		return input;
	}

	if (is.isArray(input)) {
		input = input.map(ensureNode);
		return new nodes.Merger(input, options);
	}

	if (is.isString(input)) {
		input = path.resolve(config['default'].cwd, input);
		return sources[input] || (sources[input] = new nodes.Source(input, options));
	}

	throw new Error("could not process input. Usage:\n    node2 = gobble(node1)\n    node = gobble('some/dir')\n    node = gobble([node1, node2[, nodeN]) (inputs can also be strings)\n    See " + chalk.cyan("https://github.com/gobblejs/gobble/wiki") + " for more info.");
}

function ensureNode(input) {
	return getNode(input);
}