module.exports = function ( command ) {
	var gobble = require( '../lib' ),
		cleanup = require( '../lib/utils/cleanup' ),
		config = require( '../lib/config' ),
		logger = require( '../lib/logger' );

	cleanup( config.gobbledir ).then( function () {
		var server, watcher, port = command.options.port || 4567, node;

		try {
			node = require( config.gobblefile );
			server = gobble.serve( node, { port: port });
		} catch ( err ) {
			if ( !err.gobbled ) {
				logger.error( 'error in gobblefile: ', err.message || err );
				console.trace( err );
			}
		}

		watcher = require( 'chokidar' ).watch( config.gobblefile, {
			ignoreInitial: true
		});

		watcher.on( 'change', function () {
			logger.info( 'gobblefile changed, restarting server...' );
			cleanup( config.gobbledir ).then( function () {
				server.pause();

				delete require.cache[ config.gobblefile ];

				try {
					node = require( config.gobblefile );
					server.resume( node );
				} catch ( err ) {
					logger.error( 'error in gobblefile: ', err.message || err );
					console.trace( err );
				}
			}).catch( logger.error );
		});
	}).catch( logger.error );
};
