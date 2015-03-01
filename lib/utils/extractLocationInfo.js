'use strict';

exports['default'] = extractLocationInfo;

function extractLocationInfo(err) {
	var file, line, column, match;

	if (err.file !== undefined) file = err.file;
	if (err.line !== undefined) line = err.line;
	if (err.column !== undefined) column = err.column;

	if (err.line === undefined && err.column === undefined && err.loc) {
		line = err.loc.line;
		column = err.loc.column;
	}

	if (line === undefined) {
		if (match = /line (\d+)/.exec(err.message)) {
			line = +match[1];
		}
	}

	if (column === undefined) {
		if (match = /column (\d+)/.exec(err.message)) {
			column = +match[1];
		}
	}

	return { file: file, line: line, column: column };
}