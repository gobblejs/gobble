module.exports = function ( command ) {
	var gobble = require( '../lib' ),
		cleanup = require( '../lib/utils/cleanup' ),
		config = require( '../lib/config' ),
		logger = require( '../lib/logger' );

	cleanup( config.gobbledir ).then( function () {
		var server, watcher, port = command.options.port || 4567, tree;

		try {
			tree = require( config.gobblefile );
			server = gobble.serve( tree, { port: port });
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
					tree = require( config.gobblefile );
					server.resume( tree );
				} catch ( err ) {
					logger.error( 'error in gobblefile: ', err.message || err );
					console.trace( err );
				}
			}).catch( logger.error );
		});
	}).catch( logger.error );
};
