'use strict';

exports['default'] = makeLog;

function makeLog(node) {
	var event = arguments[1] === undefined ? "info" : arguments[1];

	return function log(details) {
		// it's a string that may be formatted
		if (typeof details === "string") {
			node.emit(event, { progressIndicator: true, message: details, parameters: Array.prototype.slice.call(arguments, 1) });
		} else {
			// otherwise, pass through
			node.emit(event, details);
		}
	};
}