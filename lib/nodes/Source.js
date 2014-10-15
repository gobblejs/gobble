var path = require( 'path' ),
	fs = require( 'fs' ),
	sander = require( 'sander' ),
	chokidar = require( 'graceful-chokidar' ),
	debounce = require( 'debounce' ),
	Node = require( './Node' ),

	Promise = sander.Promise,

	GobbleError = require( '../utils/GobbleError' );

module.exports = Node.extend({
	init: function ( dir, options ) {
		var node = this, stats;

		node.dir = path.resolve( dir );
		node.callbacks = [];

		// Ensure the source exists, and is a directory
		try {
			stats = sander.statSync( node.dir );

			if ( !stats.isDirectory() ) {
				throw new Error( node.dir + ' is not a directory' );
			}
		} catch ( err ) {
			if ( err.code === 'ENOENT' ) {
				throw new GobbleError({
					code: 'ENOENT',
					path: node.dir,
					message: 'the ' + node.dir + ' directory does not exist'
				});
			}

			throw err;
		}

		node._ready = Promise.resolve( node.dir );
		node.static = options && options.static;
	},

	ready: function () {
		return this._ready;
	},

	start: function () {
		var node = this, relay, options, changes = [];

		if ( node._started || node.static ) {
			return;
		}

		node._started = true;

		relay = debounce(function () {
			var error = new GobbleError({
				code: 'INVALIDATED',
				message: 'build invalidated',
				changes: changes
			});

			node.emit( 'error', error );

			node.emit( 'ready', node.dir );

			//node._relay({ gobble: 'INVALIDATE', changes: changes }, node.dir );
			changes = [];
		}, 100 );

		options = {
			persistent: true,
			ignoreInitial: true,
			useFsEvents: false // see https://github.com/paulmillr/chokidar/issues/146
		};

		node._watcher = chokidar.watch( node.dir, options );

		[ 'add', 'change', 'unlink' ].forEach( function ( type ) {
			node._watcher.on( type, function ( path ) {
				changes.push({ type: type, path: path });
				relay();
			});
		});

		node._watcher.on( 'error', function ( err ) {
			var gobbleError;

			gobbleError = new GobbleError({
				message: 'error watching ' + node.dir + ': ' + err.message,
				code: 'SOURCE_ERROR',
				original: err
			});

			node.emit( 'error', gobbleError );
		});
	},

	stop: function () {
		// TODO
	},

	// watch: function ( callback ) {
	// 	var node = this, relay, options, changes = [];

	// 	node.callbacks.push( callback );

	// 	// If this node isn't already in watching mode, it needs to be...
	// 	if ( !node._watcher && !node.static ) {
	// 		relay = debounce(function () {
	// 			node.emit( 'info', {
	// 				id: node.id,
	// 				code: 'INVALIDATED',
	// 				changes: changes
	// 			});

	// 			node.emit( 'ready', node.dir );

	// 			//node._relay({ gobble: 'INVALIDATE', changes: changes }, node.dir );
	// 			changes = [];
	// 		}, 100 );

	// 		options = {
	// 			persistent: true,
	// 			ignoreInitial: true,
	// 			useFsEvents: false // see https://github.com/paulmillr/chokidar/issues/146
	// 		};

	// 		node._watcher = chokidar.watch( node.dir, options );

	// 		[ 'add', 'change', 'unlink' ].forEach( function ( type ) {
	// 			node._watcher.on( type, function ( path ) {
	// 				changes.push({ type: type, path: path });
	// 				relay();
	// 			});
	// 		});

	// 		node._watcher.on( 'error', function ( err ) {
	// 			var gobbleError;

	// 			gobbleError = new GobbleError({
	// 				message: 'error watching ' + node.dir + ': ' + err.message,
	// 				code: 'SOURCE_ERROR',
	// 				original: err
	// 			});

	// 			node.emit( 'error', gobbleError );
	// 		});

	// 		this.watching = true;
	// 	}

	// 	return {
	// 		cancel: function () {
	// 			node.unwatch( callback );
	// 		}
	// 	};
	// },

	// unwatch: function ( callback ) {
	// 	var callbacks = this.callbacks, index = callbacks.indexOf( callback );

	// 	if ( ~callbacks.indexOf( callback ) ) {
	// 		callbacks.splice( index, 1 );

	// 		if ( !callbacks.length && this._watcher ) {
	// 			this._watcher.close();
	// 			this._watcher = null;
	// 		}
	// 	}
	// },

	_findCreator: function ( filename ) {
		try {
			fs.statSync( filename );
			return this;
		} catch ( err ) {
			return null;
		}
	},

	_cleanup: function () {} // noop
});

function summariseChanges ( changes ) {
	var summary = {
		add: 0,
		unlink: 0,
		change: 0
	}, report = [];

	changes.forEach( function ( change ) {
		summary[ change.type ] += 1;
	});

	if ( summary.add ) {
		report.push( summary.add + ( summary.add === 1 ? ' file' : ' files' ) + ' added' );
	}

	if ( summary.change ) {
		report.push( summary.change + ( summary.change === 1 ? ' file' : ' files' ) + ' changed' );
	}

	if ( summary.unlink ) {
		report.push( summary.unlink + ( summary.unlink === 1 ? ' file' : ' files' ) + ' removed' );
	}

	return report.join( ', ' );
}