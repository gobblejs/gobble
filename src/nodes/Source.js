import fs from 'fs';
import { link, linkSync, mkdirSync, statSync, Promise } from 'sander';
import { watch } from 'graceful-chokidar';
import * as debounce from 'debounce';
import Node from './Node';
import { basename, resolve } from 'path';
import uid from '../utils/uid';
import session from '../session';
import GobbleError from '../utils/GobbleError';

export default Node.extend({
	init: function ( dir, options ) {
		var node = this, stats;

		options = options || {};

		node.id = options.id || 'source';
		node.dir = dir;
		node.callbacks = [];

		// Ensure the source exists, and is a directory
		try {
			stats = statSync( node.dir );

			if ( !stats.isDirectory() ) {
				node.file = dir;
				node.dir = undefined;

				node.uid = uid( node.id );

				node._ready = new Promise( function ( ok,  fail ) {
					node._deferred = { ok: ok, fail: fail };
				});
			} else {
				node._ready = Promise.resolve( node.dir );
			}
		} catch ( err ) {
			if ( err.code === 'ENOENT' ) {
				throw new GobbleError({
					code: 'MISSING_DIRECTORY',
					path: dir,
					message: 'the ' + dir + ' directory does not exist'
				});
			}

			throw err;
		}

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

		// this is a file watch that isn't fully initialized
		if ( this._deferred ) {
			node._makeReady();
		}

		// make sure the file is in the appropriate target directory to start
		if ( node.file ) {
			linkSync( node.file ).to( node.targetFile );
		}

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

		node._watcher = watch( node.dir, options );

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
			node._fileWatcher = watch( node.file, options );

			node._fileWatcher.on( 'change', function () {
				link( node.file ).to( node.targetFile );
			});

			node._fileWatcher.on( 'error', watchError );
		}
	},

	stop: function () {
		if ( this._watcher ) {
			this._watcher.close();
		}

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
	},

	_makeReady: function () {
		var node = this;

		node.dir = resolve( session.config.gobbledir, node.uid );
		node.targetFile = resolve( node.dir, basename( node.file ) );
		try {
			mkdirSync( node.dir );
			node._deferred.ok( node.dir );
		} catch (e) {
			node._deferred.fail( e );
			throw e;
		}

		delete node._deferred;
	}
});
