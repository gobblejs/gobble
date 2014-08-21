module.exports = function ( node, options ) {
	var http = require( 'http' ),
		path = require( 'path' ),
		crc32 = require( 'buffer-crc32' ),
		mapSeries = require( 'promise-map-series' ),
		Promise = require( 'promo' ).Promise,
		getNode = require( '../utils/getNode' ),
		file = require( '../file' ),
		compareBuffers = require( '../utils/compareBuffers' ),
		cleanup = require( '../utils/cleanup' ),
		logger = require( '../logger' ),

		handleRequest = require( './handleRequest' ),

		server,
		lrServer,
		lrServerReady,
		lrCrcs = {},
		abortLr = function () {},

		api,

		port = options.port || 4567,
		gobbledir = options.gobbledir || path.join( process.cwd(), '.gobble' ),
		error = { gobble: 'WAITING' },
		srcDir,
		buildStarted = Date.now(),
		watcher;

	api = {
		close: function () {
			return new Promise( function ( fulfil ) {
				server.removeAllListeners();
				server.close( fulfil );
			});
		},

		pause: function () {
			error = { gobble: 'WAITING' };

			logger.info( 'pausing server' );
			buildStarted = Date.now();

			watcher.cancel();
			node = null;

			return cleanup( gobbledir );
		},

		resume: function ( n ) {
			var initial = true;

			node = getNode( n );

			watcher = node.watch( function ( e, d ) {
				var newCrcs = {}, changed = [];

				if ( e ) {
					buildStarted = Date.now();
					error = e;

					// If an unexpected error occurred, reload
					if ( !e.gobble ) {
						lrServer.changed({ body: { files: '*' } });
						lrCrcs = {}; // invalidate everything for next time
					} else if ( e.gobble === 'INVALIDATE' ) {
						logger.info( 'rebuilding: ' + e.message );
					}
				}

				if ( d ) {
					error = null;
					srcDir = d;

					logger.info( 'built in {time}ms', { time: Date.now() - buildStarted });

					if ( !lrServerReady ) {
						return;
					}

					// see which files have changed, and notify livereload server
					abortLr();
					new Promise( function ( fulfil, reject ) {
						abortLr = function () {
							reject();
						};

						file.ls( srcDir ).then( function ( files ) {
							var promises = files.map( function ( filename ) {
								return file.read( srcDir, filename ).then( function ( data ) {
									var crc = newCrcs[ filename ] = crc32( data );

									if ( lrCrcs[ filename ] && compareBuffers( lrCrcs[ filename ], crc ) ) {
										return;
									}

									changed.push( path.sep === '/' ? filename : filename.split( path.sep ).join( '/' ) );
								});
							});

							return Promise.all( promises );
						}).then( fulfil, reject );
					}).then( function () {
						lrCrcs = newCrcs;

						if ( changed.length && !initial ) {
							lrServer.changed({ body: { files: changed } });
							logger.info( changed.length + ( changed.length === 1 ? ' file' : ' files' ) + ' changed, alerting livereload server' );
						}

						initial = false;
					}).catch( function ( err ) {
						logger.error( err );
					});
				}
			});
		}
	};

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

	server.on( 'request', function ( request, response ) {
		handleRequest( srcDir, error, request, response );
	});

	lrServer = require( 'tiny-lr' )();
	lrServer.error = function ( err ) {
		if ( err.code === 'EADDRINUSE' ) {
			logger.warn( 'a livereload server is already running (perhaps in a separate gobble process?). Livereload will not be available for this session' );
		} else {
			logger.error( 'livereload error: ' + err.message || err );
		}
	};

	lrServer.listen( 35729, function () {
		lrServerReady = true;
		logger.info( 'livereload server running' );
	});


	cleanup( gobbledir ).then( function () {
		api.resume( node );
	}, function ( err ) {
		logger.error( 'error emptying gobbledir: ' + err.message || err );
	});

	return api;
};
