'use strict';

var sander = require('sander');
var dir = require('./dir');
var err = require('./err');
var notfound = require('./notfound');
var waiting = require('./waiting');

exports['default'] = {
	dir: make(dir['default']),
	err: make(err['default']),
	notfound: make(notfound['default']),
	waiting: make(waiting['default'])
};

function make(template) {
	return sander.Promise.resolve(function (data) {
		return template.replace(/\$\{([^\}]+)\}/g, function (match, $1) {
			return data.hasOwnProperty($1) ? data[$1] : match;
		});
	});
}