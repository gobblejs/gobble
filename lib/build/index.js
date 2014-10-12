module.exports = function ( tree, options ) {
	var sander = require( 'sander' ),
		cleanup = require( '../utils/cleanup' ),
		messenger = require( '../messenger' ),
		GobbleError = require( '../utils/GobbleError' ),
		dest,
		gobbledir,
		promise,
		task;

	options = options || {};

	dest = options.dest;
	gobbledir = options.gobbledir || require( 'path' ).join( process.cwd(), '.gobble' );

	if ( !dest ) {
		throw new GobbleError({
			message: 'you must specify a destination folder, e.g. gobble.build({ dest: \'dist\' })',
			code: 'MISSING_DEST_DIR'
		});
	}

	// the return value is an EventEmitter...
	task = messenger.create();

	// that does double duty as a promise
	task.then = function () {
		return promise.then.apply( promise, arguments );
	};

	task.catch = function () {
		return promise.catch.apply( promise, arguments );
	};


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
		messenger.destroy();
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
