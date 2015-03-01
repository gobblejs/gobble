'use strict';

exports['default'] = compile;

function compile(string) {
	var compiled = function compiled(data) {
		return string.replace(/\{\{([^\}]+)\}\}/g, function (match, $1) {
			return data.hasOwnProperty($1) ? data[$1] : match;
		});
	};

	return compiled;
}