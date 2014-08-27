module.exports = function ( node, options ) {
	var http = require( 'http' ),
		path = require( 'path' ),
		crc32 = require( 'buffer-crc32' ),
		mapSeries = require( 'promise-map-series' ),
		Promise = require( 'promo' ).Promise,
		file = require( '../file' ),
		compareBuffers = require( '../utils/compareBuffers' ),
		cleanup = require( '../utils/cleanup' ),
		messenger = require( '../messenger' ),
		tmpDir = require( '../config/tmpDir' ),

		handleRequest = require( './handleRequest' ),

		server,
		lrServer,
		lrServerReady,
		lrCrcs = {},
		abortLr = function () {},
		initial,

		task,

		port = options.port || 4567,
		gobbledir = options.gobbledir || path.join( process.cwd(), tmpDir() ),
		error = { gobble: 'WAITING' },
		srcDir,
		buildStarted = Date.now(),
		watcher;

	task = messenger.create();

	task.close = function () {
		return new Promise( function ( fulfil ) {
			server.removeAllListeners();
			server.close( fulfil );
		});
	};

	task.pause = function () {
		error = { gobble: 'WAITING' };

		messenger.info( 'pausing server' );
		buildStarted = Date.now();

		if ( watcher ) {
			watcher.cancel();
		}
		node = null;

		return cleanup( gobbledir );
	};

	task.resume = function ( n ) {
		initial = true;

		node = n;

		node.ready().then( function ( d ) {
			handleDir( d );

			watcher = node.watch( function ( e, d ) {
				if ( e ) {
					handleError( e );
				}

				if ( d ) {
					handleDir( d );
				}
			});
		});
	};

	function handleError ( e ) {
		buildStarted = Date.now();
		error = e;

		// If an unexpected error occurred, reload
		if ( !e.gobble ) {
			lrServer.changed({ body: { files: '*' } });
			lrCrcs = {}; // invalidate everything for next time
		}
	}

	function handleDir ( d ) {
		var newCrcs = {}, changed = [];

		error = null;
		srcDir = d;

		messenger.info( 'built in %sms', Date.now() - buildStarted );

		if ( !lrServerReady ) {
			return;
		}

		// see which files have changed, and notify livereload server
		abortLr();
		new Promise( function ( fulfil, reject ) {
			abortLr = function () {
				reject({ gobble: 'ABORTED' });
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
				messenger.info( '%s %s changed, alerting livereload server', changed.length, ( changed.length === 1 ? ' file' : ' files' ) );
			}

			initial = false;
		}).catch( function ( err ) {
			if ( !err.gobble ) {
				messenger.error( err );
			}
		});
	}

	server = http.createServer();

	server.on( 'error', function ( err ) {
		if ( err.code === 'EADDRINUSE' ) {
			messenger.error( 'port %s is already in use. Are you already running gobble? You can specify a different port with e.g. ' + 'gobble -p 5678'.cyan, port );
		}

		process.exit( 1 );
	});

	server.listen( port, function () {
		messenger.info( 'server listening on port %s', port );
	});

	server.on( 'request', function ( request, response ) {
		handleRequest( srcDir, error, request, response );
	});

	lrServer = require( 'tiny-lr' )();
	lrServer.error = function ( err ) {
		if ( err.code === 'EADDRINUSE' ) {
			messenger.warn( 'a livereload server is already running (perhaps in a separate gobble process?). Livereload will not be available for this session' );
		} else {
			messenger.error( 'livereload error: %s', err.message || err );
		}
	};

	lrServer.listen( 35729, function () {
		lrServerReady = true;
		messenger.info( 'livereload server running' );
	});


	cleanup( gobbledir ).then( function () {
		task.resume( node );
	}, function ( err ) {
		messenger.error( 'error emptying gobbledir: %s', err.message || err );
	});

	return task;
};
