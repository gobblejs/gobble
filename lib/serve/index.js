module.exports = function ( node, options ) {
	var http = require( 'http' ),
		Promise = require( 'sander' ).Promise,
		cleanup = require( '../utils/cleanup' ),
		session = require( '../session' ),
		GobbleError = require( '../utils/GobbleError' ),
		summariseChanges = require( '../utils/summariseChanges' ),

		handleRequest = require( './handleRequest' ),

		server,
		serverReady,
		lrServer,
		lrServerReady,
		built = false,
		firedReadyEvent = false,
		buildScheduled = false,

		task,
		subtask,

		port,
		gobbledir,
		error = { gobble: 'WAITING' },
		srcDir,
		buildStarted = Date.now(),
		watcher;

	options = options || {};

	port = options.port || 4567;
	gobbledir = require( 'path' ).resolve( process.cwd(), options.gobbledir || process.env.GOBBLE_TMP_DIR || '.gobble' );

	task = session.create({
		gobbledir: gobbledir
	});

	task.close = function () {
		if ( node ) {
			node.stop();
		}

		return new Promise( function ( fulfil ) {
			session.destroy();
			server.removeAllListeners();
			server.close( fulfil );
		});
	};

	task.pause = function () {
		error = { gobble: 'WAITING' };

		session.info( 'pausing server' );
		buildStarted = Date.now();

		if ( watcher ) {
			watcher.cancel();
		}

		if ( node ) {
			node.stop();
		}

		node = null;

		return cleanup( gobbledir );
	};

	task.resume = function ( n ) {
		node = n;

		// TODO is this the best place to handle this stuff? or is it better
		// to pass off the info to e.g. gobble-cli?
		node.on( 'info', function ( details ) {
			if ( subtask ) {
				subtask.done();
			}

			switch ( details.code ) {
				case 'TRANSFORM_START':
					subtask = session.start( '%s transformation running...', details.id );
					break;

				case 'TRANSFORM_END':
					session.info( '%s transformation finished in %sms', details.id, details.duration );
					break;

				case 'MERGE_START':
					break;

				case 'MERGE_END':
					session.info( '%s finished in %sms', details.id, details.duration );
					break;

				default:
					console.log( 'info', details );
			}
		});

		node.on( 'error', handleError );

		node.start();
		build();
	};

	function build () {
		var buildStart = Date.now();

		buildScheduled = false;

		node.ready().then( function ( d ) {
			error = null;
			srcDir = d;

			built = true;

			session.info( 'built in %sms', Date.now() - buildStart );
			session.emit( 'built' );

			if ( !firedReadyEvent && serverReady ) {
				session.emit( 'ready' );
				firedReadyEvent = true;
			}

			if ( !lrServerReady ) {
				return;
			}

			lrServer.changed({ body: { files: '*' } });
		}).catch( handleError );
	}

	function handleError ( e ) {
		if ( e.code === 'MERGE_ABORTED' ) {
			return;
		}

		if ( e.code === 'INVALIDATED' ) {
			// A node can depend on the same source twice, which will result in
			// simultaneous rebuilds unless we defer it to the next tick
			if ( !buildScheduled ) {
				buildScheduled = true;
				session.info( 'build invalidated (%s). restarting', summariseChanges( e.changes ) );

				process.nextTick( build );
			}
		} else {
			session.error( e );
		}

		if ( subtask ) {
			subtask.done();
		}

		error = e; // store it, so we can serve relevant info to the browser
		lrServer.changed({ body: { files: '*' } });
	}

	server = http.createServer();

	server.on( 'error', function ( err ) {
		if ( err.code === 'EADDRINUSE' ) {
			// We need to create our own error, so we can pass along port info
			err = new GobbleError({
				code: 'PORT_IN_USE',
				message: 'port ' + port + ' is already in use',
				port: port
			});
		}

		session.error( err );

		process.exit( 1 );
	});

	server.listen( port, function () {
		serverReady = true;

		if ( !firedReadyEvent && built ) {
			session.emit( 'ready' );
			firedReadyEvent = true;
		}

		session.info( 'server listening on port %s', port );
	});

	server.on( 'request', function ( request, response ) {
		handleRequest( srcDir, error, request, response );
	});

	lrServer = require( 'tiny-lr' )();
	lrServer.error = function ( err ) {
		if ( err.code === 'EADDRINUSE' ) {
			session.warn( 'a livereload server is already running (perhaps in a separate gobble process?). Livereload will not be available for this session' );
		} else {
			session.error( 'livereload error: %s', err.message || err );
		}
	};

	lrServer.listen( 35729, function () {
		lrServerReady = true;
		session.info( 'livereload server running' );
	});


	cleanup( gobbledir ).then( function () {
		task.resume( node );
	}, function ( err ) {
		session.error( 'error emptying gobbledir: %s', err.message || err );
	});

	return task;
};
