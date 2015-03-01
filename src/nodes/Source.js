import { basename, resolve } from 'path';
import { link, linkSync, mkdirSync, statSync, Promise } from 'sander';
import { watch } from 'graceful-chokidar';
import * as debounce from 'debounce';
import Node from './Node';
import uid from '../utils/uid';
import session from '../session';
import GobbleError from '../utils/GobbleError';

export default class Source extends Node {
	constructor ( dir, options = {} ) {
		super();

		this.id = options.id || 'source';
		this.dir = dir;
		this.callbacks = [];

		// Ensure the source exists, and is a directory
		try {
			let stats = statSync( this.dir );

			if ( !stats.isDirectory() ) {
				this.file = dir;
				this.dir = undefined;

				this.uid = uid( this.id );

				this._ready = new Promise( ( ok, fail ) => {
					this._deferred = { ok, fail };
				});
			} else {
				this._ready = Promise.resolve( this.dir );
			}
		} catch ( err ) {
			if ( err.code === 'ENOENT' ) {
				throw new GobbleError({
					code: 'MISSING_DIRECTORY',
					path: dir,
					message: `the ${dir} directory does not exist`
				});
			}

			throw err;
		}

		this.static = options && options.static;
	}

	ready () {
		return this._ready;
	}

	start () {
		var relay, options, watchError, changes = [];

		if ( this._active || this.static ) {
			return;
		}

		this._active = true;

		// this is a file watch that isn't fully initialized
		if ( this._deferred ) {
			this._makeReady();
		}

		// make sure the file is in the appropriate target directory to start
		if ( this.file ) {
			linkSync( this.file ).to( this.targetFile );
		}

		relay = debounce( () => {
			var error = new GobbleError({
				code: 'INVALIDATED',
				message: 'build invalidated',
				changes: changes
			});

			this.emit( 'error', error );
			changes = [];
		}, 100 );

		options = {
			persistent: true,
			ignoreInitial: true,
			useFsEvents: false // see https://github.com/paulmillr/chokidar/issues/146
		};

		this._watcher = watch( this.dir, options );

		[ 'add', 'change', 'unlink' ].forEach( type => {
			this._watcher.on( type, path => {
				changes.push({ type, path });
				relay();
			});
		});

		watchError = err => {
			var gobbleError = new GobbleError({
				message: 'error watching ' + this.dir + ': ' + err.message,
				code: 'SOURCE_ERROR',
				original: err
			});

			this.emit( 'error', gobbleError );
		};

		this._watcher.on( 'error', watchError );

		if ( this.file ) {
			this._fileWatcher = watch( this.file, options );

			this._fileWatcher.on( 'change', () => {
				link( this.file ).to( this.targetFile );
			});

			this._fileWatcher.on( 'error', watchError );
		}
	}

	stop () {
		if ( this._watcher ) {
			this._watcher.close();
		}

		if ( this._fileWatcher ) {
			this._fileWatcher.close();
		}

		this._active = false;
	}

	_findCreator ( filename ) {
		try {
			statSync( filename );
			return this;
		} catch ( err ) {
			return null;
		}
	}

	_makeReady () {
		this.dir = resolve( session.config.gobbledir, this.uid );
		this.targetFile = resolve( this.dir, basename( this.file ) );

		try {
			mkdirSync( this.dir );
			this._deferred.ok( this.dir );
		} catch (e) {
			this._deferred.fail( e );
			throw e;
		}

		delete this._deferred;
	}
}
