import { basename, relative, resolve } from 'path';
import { link, linkSync, mkdirSync, statSync, Promise } from 'sander';
import { watch, Directory, File } from 'pathwatcher';
import * as debounce from 'debounce';
import Node from './Node';
import uid from '../utils/uid';
import session from '../session/index.js';
import GobbleError from '../utils/GobbleError';

export default class Source extends Node {
	constructor ( dir, options = {} ) {
		super();

		this.id = options.id || 'source';
		this.dir = dir;
		this.callbacks = [];
		this._entries = {};

		// Ensure the source exists, and is a directory
		try {
			const stats = statSync( this.dir );

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

		let changed = {};

		const relay = debounce( () => {
			let changes = [];

			Object.keys( changed ).forEach( path => {
				const type = changed[ path ];
				let change = { type, file: relative( this.dir, path ) };

				type === 'add'    && ( change.added = true );
				type === 'change' && ( change.changed = true );
				type === 'unlink' && ( change.removed = true );

				changes.push( change );
			});

			this.emit( 'invalidate', this.changes = changes );
			changed = {};
		}, 100 );

		if ( this.dir ) {
			this._dir = new Directory( this.dir );
			const processDirEntries = ( err, entries, initial ) => {
				if (err) throw err;

				entries.forEach( entry => {
					if ( this._entries[ entry.path ] ) return;
					else if ( !initial ) {
						changed[ entry.path ] = 'add';
					}

					this._entries[ entry.path ] = entry;

					if ( entry instanceof File ) {
						entry.onDidChange( () => {
							changed[ entry.path ] = 'change';
							relay();
						});

						let doDelete = () => {
							this._entries[ entry.path ].unsubscribeFromNativeChangeEvents();
							this._entries[ entry.path ] = null;
							changed[ entry.path ] = 'unlink';
							relay();
						};

						entry.onDidDelete( doDelete );
						entry.onDidRename( doDelete );

					} else if ( entry instanceof Directory ) {
						entry.onDidChange( () => {
							entry.getEntries( processDirEntries );
						});

						entry.getEntries( ( err, entries ) => {
							processDirEntries( err, entries, initial );
						});
					}
				});
			}

			this._dir.getEntries( processDirEntries );
			processDirEntries( null, [ this._dir ], true );
		}

		if ( this.file ) {
			this._fileWatcher = watch( this.file, ( type ) => {
				if ( type === 'change' ) link( this.file ).to( this.targetFile );
			});
		}
	}

	stop () {
		if ( this._dir ) {
			Object.keys(this._entries).forEach( path => {
				this._entries[ path ].unsubscribeFromNativeChangeEvents();
				delete this._entries[ path ];
			})
			this._dir.unsubscribeFromNativeChangeEvents();
			this._dir = null;
		}

		if ( this._fileWatcher ) {
			this._fileWatcher.close();
			this._fileWatcher = null;
		}

		this._active = false;
	}

	active () {
		return this._active;
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
