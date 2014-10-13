module.exports = function ( node, options ) {
	var sander = require( 'sander' ),
		cleanup = require( '../utils/cleanup' ),
		session = require( '../session' ),
		GobbleError = require( '../utils/GobbleError' ),
		dest,
		gobbledir,
		promise,
		task;

	options = options || {};
	dest = options.dest;
	gobbledir = require( 'path' ).join( process.cwd(), options.gobbledir || process.env.GOBBLE_TMP_DIR || '.gobble-build' );

	if ( !dest ) {
		throw new GobbleError({
			message: 'you must specify a destination folder, e.g. gobble.build({ dest: \'dist\' })',
			code: 'MISSING_DEST_DIR'
		});
	}

	// the return value is an EventEmitter...
	task = session.create({
		gobbledir: gobbledir
	});

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
			session.info( 'destination directory not empty. In force mode, continuing anyway' );
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
		session.emit( 'complete' );
		session.destroy();
	})
	.catch( function ( err ) {
		session.error( err );
		session.destroy();
		throw err;
	});

	return task;

	function build () {
		session.emit( 'info', 'build started' );

		return node.ready().then( function ( inputdir ) {
			return sander.copydir( inputdir ).to( dest ).then( function () {
				return sander.rimraf( gobbledir );
			});
		});
	}
};
