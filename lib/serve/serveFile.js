var mime = require( 'mime' ),
	read = require( '../file/read' );

module.exports = function serveFile ( filepath, request, response ) {
	return read( filepath ).then( function ( data ) {
		response.statusCode = 200;
		response.setHeader( 'Content-Type', mime.lookup( filepath ) );
		response.setHeader( 'Content-Length', data.length );

		response.write( data );
		response.end();
	});
};
