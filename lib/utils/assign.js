'use strict';

exports['default'] = assign;

function assign(target) {
	for (var _len = arguments.length, sources = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
		sources[_key - 1] = arguments[_key];
	}

	sources.forEach(function (source) {
		var key;

		for (key in source) {
			if (source.hasOwnProperty(key)) {
				target[key] = source[key];
			}
		}
	});

	return target;
}