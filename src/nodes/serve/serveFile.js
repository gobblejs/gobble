import { lookup } from 'mime';
import { readFile } from 'sander';

export default function serveFile ( filepath, request, response ) {
	return readFile( filepath ).then( function ( data ) {
		response.statusCode = 200;
		response.setHeader( 'Content-Type', lookup( filepath ) );
		response.setHeader( 'Content-Length', data.length );

		response.write( data );
		response.end();
	});
}
