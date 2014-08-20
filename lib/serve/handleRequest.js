module.exports = function handleRequest ( srcDir, error, request, response ) {
	var join = require( 'path' ).join,
		stat = require( '../file/stat' ),
		logger = require( '../logger' ),
		serveFile = require( './serveFile' ),
		serveDir = require( './serveDir' ),
		serveError = require( './serveError' ),
		filepath;

	if ( error ) {
		serveError( error, request, response );
		return;
	}

	filepath = join( srcDir, request.url );

	stat( filepath ).then( function ( stats ) {
		if ( stats.isDirectory() ) {
			// might need to redirect from `foo` to `foo/`
			if ( request.url.slice( -1 ) !== '/' ) {
				response.setHeader( 'Location', request.url + '/' );
				response.writeHead( 301 );

				response.end();
			} else {
				return serveDir( filepath, request, response );
			}
		}

		else {
			return serveFile( filepath, request, response );
		}
	}, function ( err ) {
		return serveError( err, request, response );
	}).catch( logger.error );
};
