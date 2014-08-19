module.exports = function ( node, options ) {
	var http = require( 'http' ),
		Promise = require( 'promo' ).Promise,
		getNode = require( '../utils/getNode' ),
		logger = require( '../logger' ),

		handleRequest = require( './handleRequest' ),

		server,
		lrServer,
		api,

		port = options.port || 8000,
		error = { gobble: 'WAITING' },
		srcDir,
		pending,
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

					logger.info( 'built in {time}ms', { time: Date.now() - buildStarted });

					if ( pending ) {
						handleRequest( srcDir, error, pending.request, pending.response );
						pending = null;
					}
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



	api.resume( node );
	return api;
};
