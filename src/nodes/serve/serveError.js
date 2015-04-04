import errTemplate from './templates/err';
import waitingTemplate from './templates/waiting';
import notfoundTemplate from './templates/notfound';

const entities = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
	'/': '&#x2F;'
};

const colors = {
	37: 'white',
	90: 'grey',
	30: 'black',
	34: 'blue',
	36: 'cyan',
	32: 'green',
	35: 'magenta',
	31: 'red',
	33: 'yellow'
};

export default function serveError ( error, request, response ) {
	let html; // should be a block-scoped const, but jshint...

	if ( error.gobble === 'WAITING' ) {
		response.statusCode = 420;
		response.write( waitingTemplate() );

		response.end();
	}

	else if ( error.code === 'ENOENT' ) {
		html = notfoundTemplate({
			path: error.path
		});

		response.statusCode = 404;
		response.write( html );

		response.end();
	}

	else {
		const message = escape( error.original ? error.original.message || error.original : error );
		const filename = error.original ? error.original.filename : error.filename;

		html = errTemplate({
			id: error.id,
			message: message.replace( /\[(\d+)m/g, ( match, $1 ) => {
				let color;

				if ( match === '[39m' ) {
					return '</span>';
				}

				if ( color = colors[ $1 ] ) {
					return `<span style="color:${color};">`;
				}

				return '';
			}), // remove colors
			stack: prepareStack( error.stack ),
			filemessage: filename ? `<p>The error occurred while processing <strong>${filename}</strong>.</p>` : ''
		});

		// turn filepaths into links
		html = html.replace( /([>\s\(])(&#x2F[^\s\):<]+)/g, ( match, $1, $2 ) => {
			return `${$1}<a href="/__gobble__${$2}">${$2}</a>`;
		});

		response.statusCode = 500;
		response.write( html );

		response.end();
	}
}

function prepareStack ( stack ) {
	return stack.split( '\n' )
		.filter( line => line !== 'Error' )
		.map( line => `<li>${escape( line.trim() )}</li>` )
		.join( '' );
}

function escape ( str ) {
	return ( str || '' ).replace( /[&<>"'\/]/g, char => entities[ char ] );
}
