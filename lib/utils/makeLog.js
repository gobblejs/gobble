'use strict';

exports['default'] = makeLog;

function makeLog(node) {
	var _arguments = arguments;
	var event = arguments[1] === undefined ? "info" : arguments[1];

	return function (details) {
		// it's a string that may be formatted
		if (typeof details === "string") {
			node.emit(event, { progressIndicator: true, message: details, parameters: Array.prototype.slice.call(_arguments, 1) });
		} else {
			// otherwise, pass through
			node.emit(event, details);
		}
	};
}