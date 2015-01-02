var fs = require( 'fs' ),
	sander = require( 'sander' ),
	chokidar = require( 'graceful-chokidar' ),
	debounce = require( 'debounce' ),
	Node = require( './Node' ),
	_path = require( 'path' ),
	uid = require( '../utils/uid' ),

	Promise = sander.Promise,

	GobbleError = require( '../utils/GobbleError' );

module.exports = Node.extend({
	init: function ( dir, options ) {
		var node = this, stats;

		node.dir = dir;
		node.callbacks = [];

		// Ensure the source exists, and is a directory
		try {
			stats = sander.statSync( node.dir );

			if ( !stats.isDirectory() ) {
				node.file = dir;
				node.dir = _path.resolve( process.env.GOBBLE_TMP_DIR || '.gobble-tmp', uid( 'file-watch' ) );
				node.targetFile = _path.resolve( node.dir, _path.basename( node.file ) );
				sander.mkdirSync( node.dir );
			}
		} catch ( err ) {
			if ( err.code === 'ENOENT' ) {
				throw new GobbleError({
					code: 'MISSING_DIRECTORY',
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
		var node = this, relay, options, watchError, changes = [];

		if ( node._active || node.static ) {
			return;
		}

		node._active = true;

		relay = debounce(function () {
			var error = new GobbleError({
				code: 'INVALIDATED',
				message: 'build invalidated',
				changes: changes
			});

			node.emit( 'error', error );
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

		watchError = function ( err ) {
			var gobbleError;

			gobbleError = new GobbleError({
				message: 'error watching ' + node.dir + ': ' + err.message,
				code: 'SOURCE_ERROR',
				original: err
			});

			node.emit( 'error', gobbleError );
		};

		node._watcher.on( 'error', watchError );

		if ( node.file ) {
			node._fileWatcher = chokidar.watch( node.file, options );

			node._fileWatcher.on( 'change', function () {
				sander.link( node.file ).to( node.targetFile );
			});

			node._fileWatcher.on( 'error', watchError );
		}
	},

	stop: function () {
		this._watcher.close();
		if ( this._fileWatcher ) {
			this._fileWatcher.close();
		}
		this._active = false;
	},

	_findCreator: function ( filename ) {
		try {
			fs.statSync( filename );
			return this;
		} catch ( err ) {
			return null;
		}
	}
});
