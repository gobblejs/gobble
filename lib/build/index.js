module.exports = function ( tree, options ) {
	var readdir = require( '../file/readdir' ),
		copydir = require( '../file/copydir' ),
		cleanup = require( '../utils/cleanup' ),
		messenger = require( '../messenger' ),
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
		messenger.error( 'You must specify a destination folder, e.g. ' + 'gobble.build({ dest: \'dist\' })'.cyan );
		process.exit( 1 );
	}

	promise = cleanup( gobbledir ).then( function () {
		// Check that nothing exists in the dest folder
		if ( options.force ) {
			return cleanup( dest ).then( build );
		} else {
			return readdir( dest ).then( function ( files ) {
				if ( files.length ) {
					throw new Error( 'destination folder \'' + gobbledir + '\' is not empty! Use --force (or -f) to continue anyway' );
					return;
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
		messenger.emit( 'error', err );
		throw err;
	});

	return task;

	function build () {
		messenger.emit( 'info', 'build started' );

		return tree.ready().then( function ( inputDir ) {
			return copydir( inputDir ).to( dest );
		});
	}
};
