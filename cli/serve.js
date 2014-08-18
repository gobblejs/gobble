module.exports = function ( command ) {
	var gobble = require( '../lib' ),
		cleanup = require( '../lib/utils/cleanup' ),
		config = require( '../lib/config' ),
		logger = require( '../lib/logger' );

	cleanup( config.gobbledir ).then( function () {
		var server, watcher, port = command.options.port || 4567;

		server = gobble.serve( gobble( require( config.gobblefile ) ), { port: port });

		watcher = require( 'chokidar' ).watch( config.gobblefile, {
			ignoreInitial: true
		});

		watcher.on( 'change', function () {
			logger.info( 'gobblefile changed, restarting server...' );
			cleanup( config.gobbledir ).then( function () {
				server.close().then( restart, restart );
			}).catch( logger.error );
		});

		function restart () {
			delete require.cache[ config.gobblefile ];
			server = gobble.serve( gobble( require( config.gobblefile ) ), { port: port });
		}
	}).catch( logger.error );
};
