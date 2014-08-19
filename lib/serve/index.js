module.exports = function ( node, options ) {
	var path = require( 'path' ),
		http = require( 'http' ),
		mime = require( 'mime' ),
		Promise = require( 'promo' ).Promise,
		getNode = require( '../utils/getNode' ),
		file = require( '../file' ),
		logger = require( '../logger' ),
		server,
		api,

		templates = {},

		port = options.port || 8000,
		error = { pending: true },
		srcDir,
		pending,
		buildStarted = Date.now(),
		watcher;

	api = {
		close: function () {
			return new Promise( function ( fulfil ) {
				server.removeAllListeners();

				server.close( fulfil );
				setTimeout( fulfil, 200 );
			});
		},

		pause: function () {
			error = { gobble: 'waiting for files' };

			logger.info( 'pausing server' );

			watcher.cancel();
			node = null;
		},

		resume: function ( n ) {
			node = getNode( n );

			watcher = node.watch( function ( e, d ) {
				if ( e ) {
					buildStarted = Date.now();
					error = e;
				} else {
					error = null;
					srcDir = d;

					logger.info( 'serving on http://localhost:{port}', { port: port });

					if ( pending ) {
						handleRequest( pending.request, pending.response );
						pending = null;
					}
				}
			});
		}
	};

	templates.dir = (function () {
		return file.read( path.resolve( __dirname, 'templates/dir.html' ) ).then( function ( t ) {
			t = t.toString();

			return function ( replacers ) {
				return t.replace( /\$\{([^\}]+)\}/g, function ( match, $1 ) {
					return replacers[ $1 ] || match;
				});
			};
		});
	}());


	server = http.createServer();

	server.on( 'error', function ( err ) {
		if ( err.code === 'EADDRINUSE' ) {
			logger.error( 'port {port} is already in use. Are you already running gobble? You can specify a different port with e.g. ' + 'gobble -p 5678'.cyan, { port: port });
		}

		process.exit( 1 );
	});

	server.listen( port, function () {
		logger.info( 'server listening on port {port}', { port: port });
	});

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

		file.stat( filepath ).then( function ( stats ) {
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
			response.statusCode = 404;

			response.write( '<style>body{font-family:"Helvetica Neue",arial,sans-serif;color:#333;font-weight:200}h1{font-size:4em;font-weight:200;margin:0}</style><h1>404</h1><p>' + err.message || err + '</p>' );
			response.end();
		}).catch( logger.error );
	}

	function serveDir( filepath, request, response ) {
		var index = path.resolve( filepath, 'index.html' );

		return file.exists( index ).then( function ( exists ) {
			if ( exists ) {
				return serveFile( index, request, response );
			}

			return file.readdir( filepath ).then( function ( files ) {
				var items;

				items = files.map( function ( filename ) {
					var stats, isDir;

					stats = require( 'fs' ).statSync( path.resolve( filepath, filename ) );
					isDir = stats.isDirectory();

					return {
						href: filename,
						isDir: isDir,
						type: isDir ? 'dir' : path.extname( filename )
					};
				});

				items.sort( function ( a, b ) {
					if ( ( a.isDir && b.isDir ) || ( !a.isDir && !b.isDir ) ) {
						return a.href < b.href ? 1 : -1;
					}

					return a.isDir ? -1 : 1;
				});

				return templates.dir.then( function ( dirTemplate ) {
					var html;

					html = dirTemplate({
						url: request.url,
						items: items.map( function ( item ) {
							return '<li class="' + item.type + '"><a href="' + item.href + '">' + item.href + '</a></li>';
						}).join( '' )
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
		return file.read( filepath ).then( function ( data ) {
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

	api.resume( node );
	return api;
};
