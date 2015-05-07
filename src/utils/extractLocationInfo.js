/**
 * Extracts location info from error objects using a set of heuristics
   based on real-world examples
 * @param {object} err - an error object thrown by a transpiler
 * @returns {file, line, column}
 */
export default function extractLocationInfo ( err ) {
	let { file, line, column, message, loc } = err;

	if ( !file && err.filename ) {
		file = err.filename;
	}

	if ( line === undefined && column === undefined && loc ) {
		line = loc.line;
		column = loc.column;
	}

	let match;

	if ( line === undefined ) {
		if ( match = /line (\d+)/.exec( message ) ) {
			line = +match[1];
		}
	}

	if ( column === undefined ) {
		if ( match = /column (\d+)/.exec( message ) ) {
			column = +match[1];
		}
	}

	// Handle errors from e.g. browserify
	// Unexpected token (123:456) while parsing /path/to/.gobble/12-derequire/1/app.js
	if ( line === undefined && column === undefined ) {
		const match = /(\d+):(\d+)/.exec( message );

		if ( match ) {
			line = match[1];
			column = match[2];
		}
	}

	return { file, line, column };
}
