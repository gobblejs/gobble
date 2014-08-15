module.exports = function ( node, options ) {
	var path = require( 'path' ),
		http = require( 'http' ),
		mime = require( 'mime' ),
		template = require( 'lodash.template' ),
		Promise = require( 'promo' ).Promise,
		helpers = require( '../helpers' ),
		debug = require( '../utils/debug' ),
		server,
		api,

		templates = {},

		port = options.port || 8000,
		error = { pending: true },
		srcDir,
		pending,
		buildStarted = Date.now();


	templates.dir = (function () {
		return helpers.read( path.join( __dirname, 'templates/dir.html' ) ).then( function ( t ) {
			return template( t );
		});
	}());


	console.log( 'Serving on http://localhost:' + port );

	server = http.createServer();
	server.listen( port );

	server.on( 'request', handleRequest );

	function handleRequest ( request, response ) {
		var filepath;

		if ( error ) {
			if ( error.pending ) {
				pending = {
					request: request,
					response: response
				};
				return;
			}

			else {
				serveError( request, response );
				return;
			}
		}

		pending = null;

		filepath = path.join( srcDir, request.url );

		helpers.stat( filepath ).then( function ( stats ) {
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
			console.log( 'Failed to serve ' + filepath + ': ' + err.message || err );

			response.statusCode = 404;

			response.write( err.message || err );
			response.end();
		}).catch( debug );
	}

	function serveDir( filepath, request, response ) {
		var index = path.join( filepath, 'index.html' );

		return helpers.exists( index ).then( function ( exists ) {
			if ( exists ) {
				return serveFile( index, request, response );
			}

			return helpers.readdir( filepath ).then( function ( files ) {
				var items;

				items = files.map( function ( file ) {
					var stats, isDir;

					stats = require( 'fs' ).statSync( path.join( filepath, file ) );
					isDir = stats.isDirectory();

					return {
						href: file,
						isDir: isDir,
						type: isDir ? 'dir' : path.extname( file )
					}
				});

				items.sort( function ( a, b ) {
					if ( ( a.isDir && b.isDir ) || ( !a.isDir && !b.isDir ) ) {
						return a.file < b.file ? 1 : -1;
					}

					return a.isDir ? -1 : 1;
				});

				return templates.dir.then( function ( dirTemplate ) {
					var html;

					html = dirTemplate({
						url: request.url,
						items: items
					});

					response.statusCode = 200;
					response.setHeader( 'Content-Type', mime.lookup( 'html' ) );
					response.setHeader( 'Content-Length', html.length );

					response.write( html );
					response.end();
				});
			});
		});
	}

	function serveFile ( filepath, request, response ) {
		return helpers.read( filepath ).then( function ( data ) {
			response.statusCode = 200;
			response.setHeader( 'Content-Type', mime.lookup( filepath ) );
			response.setHeader( 'Content-Length', data.length );

			response.write( data );
			response.end();
		});
	}

	function serveError ( request, response ) {
		response.statusCode = 500;
		response.write( error.message );

		response.end();
	}

	node.watch( function ( e, d ) {
		if ( e ) {
			buildStarted = Date.now();
			error = e;
		} else {
			error = null;
			srcDir = d;

			if ( pending ) {
				handleRequest( pending.request, pending.response );
				pending = null;
			}
		}
	});

	api = {
		close: function () {
			console.log( 'closing server TODO' );
			return Promise.resolve();
		}
	};

	return api;
};
