export default function extractLocationInfo ({ file, line, column, message, loc }) {
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

	return { file, line, column };
}
