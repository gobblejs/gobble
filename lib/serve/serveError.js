var templates = require( './templates' );

module.exports = function serveError ( error, request, response ) {
	if ( error.gobble === 'WAITING' ) {
		templates.waiting().then( function ( template ) {
			response.statusCode = 420;
			response.write( template() );

			response.end();
		})
	}

	else if ( error.code === 'ENOENT' ) {
		templates.notfound().then( function ( template ) {
			var html = template({
				path: error.path
			});

			response.statusCode = 404;
			response.write( html );

			response.end();
		})
	}

	else {
		templates.err().then( function ( template ) {
			var html, id, message, filename;

			id = error.id;
			message = error.original ? error.original.message || error.original : error;
			filename = error.original ? error.original.filename : error.filename;

			console.log( 'error', error );

			html = template({
				id: id,
				message: message,
				stack: prepareStack( error.stack ),
				filemessage: filename ? '<p>The error occurred while processing <strong>' + filename + '</strong>.</p>' : ''
			});

			response.statusCode = 500;
			response.write( html );

			response.end();
		});
	}
};

function prepareStack ( stack ) {
	return stack.split( '\n' ).filter( function ( line ) {
		return line !== 'Error';
	}).map( function ( line ) {
		return '<li>' + line.trim() + '</li>';
	}).join( '' );
}
