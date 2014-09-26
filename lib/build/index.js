module.exports = function ( tree, options ) {
	var sander = require( 'sander' ),
		cleanup = require( '../utils/cleanup' ),
		messenger = require( '../messenger' ),
		GobbleError = require( '../utils/GobbleError' ),
		dest,
		gobbledir,
		promise,
		task;

	// the return value is an EventEmitter...
	task = messenger.create();

	// that does double duty as a promise
	task.then = function () {
		return promise.then.apply( promise, arguments );
	};

	task.catch = function () {
		return promise.catch.apply( promise, arguments );
	};


	dest = options.dest;
	gobbledir = options.gobbledir || require( 'path' ).join( process.cwd(), '.gobble' );

	if ( !dest ) {
		messenger.error( 'you must specify a destination folder, e.g. ' + 'gobble.build({ dest: \'dist\' })'.cyan );
		process.exit( 1 );
	}

	promise = cleanup( gobbledir ).then( function () {
		// Check that nothing exists in the dest folder
		if ( options.force ) {
			messenger.info( 'destination directory not empty. In force mode, continuing anyway' );
			return cleanup( dest ).then( build );
		} else {
			return sander.readdir( dest ).then( function ( files ) {
				if ( files.length ) {
					throw new GobbleError({
						message: 'destination folder (' + dest + ') is not empty',
						code: 'DIR_NOT_EMPTY',
						path: dest
					});
				}

				return build();
			}, build );
		}
	})
	.then( function () {
		messenger.emit( 'complete' );
		messenger.destroy();
	})
	.catch( function ( err ) {
		messenger.error( err );
		throw err;
	});

	return task;

	function build () {
		messenger.emit( 'info', 'build started' );

		return tree.ready().then( function ( inputDir ) {
			return sander.copydir( inputDir ).to( dest );
		});
	}
};
