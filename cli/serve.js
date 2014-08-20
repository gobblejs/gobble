module.exports = function ( command, gobble, cwd, gobblefile, gobbledir ) {
	var server,
		watcher,
		port,
		resuming = true;

	port = command.options.port || 4567;

	try {
		node = require( gobblefile );
		server = gobble.serve( node, {
			port: port,
			gobbledir: gobbledir
		});
	} catch ( err ) {
		if ( !err.gobble ) {
			console.log( 'error in gobblefile' );
			console.trace( err );
		}
	}

	watcher = require( 'chokidar' ).watch( gobblefile, {
		ignoreInitial: true
	});

	watcher.on( 'change', function () {
		if ( resuming ) {
			return;
		}

		console.log( 'gobblefile changed, restarting server...' );

		resuming = true;

		server.pause().then( function () {
			resuming = false;

			delete require.cache[ config.gobblefile ];

			try {
				node = require( gobblefile );
				server.resume( node );
			} catch ( err ) {
				console.log( 'error in gobblefile' );
				console.trace( err );
			}
		}, function () {
			resuming = false;
		});
	});
};
