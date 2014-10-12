module.exports = function ( node, options ) {
	var http = require( 'http' ),
		Promise = require( 'promo' ).Promise,
		cleanup = require( '../utils/cleanup' ),
		session = require( '../session' ),
		GobbleError = require( '../utils/GobbleError' ),

		handleRequest = require( './handleRequest' ),

		server,
		lrServer,
		lrServerReady,
		initial,

		task,

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
		return new Promise( function ( fulfil ) {
			server.removeAllListeners();
			server.close( function () {
				session.destroy();
				fulfil();
			});
		});
	};

	task.pause = function () {
		error = { gobble: 'WAITING' };

		session.info( 'pausing server' );
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

		watcher = node.watch( function ( e, d ) {
			if ( e ) {
				handleError( e );
			}

			if ( d ) {
				handleDir( d );
				node._cleanup();
			}
		});

		node.ready().then( handleDir );
	};

	function handleError ( e ) {
		buildStarted = Date.now();
		error = e;

		// If an unexpected error occurred, reload
		if ( !e.gobble ) {
			lrServer.changed({ body: { files: '*' } });
		}
	}

	function handleDir ( d ) {
		error = null;
		srcDir = d;

		session.info( 'built in %sms', Date.now() - buildStarted );

		if ( !lrServerReady ) {
			return;
		}

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
		session.emit( 'ready' );
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
