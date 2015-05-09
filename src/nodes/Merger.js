import { join, resolve, sep } from 'path';
import {
	lstat,
	mkdir,
	mkdirSync,
	readdir,
	readdirSync,
	realpathSync,
	rimrafSync,
	stat,
	symlinkOrCopy,
	symlinkOrCopySync,
	unlink,
	unlinkSync,
	Promise
} from 'sander';
import * as mapSeries from 'promise-map-series';
import Node from './Node';
import session from '../session';
import uid from '../utils/uid';
import { ABORTED } from '../utils/signals';

function mergeDirectories ( src, dest ) {
	return stat( dest ).then( stats => {
		if ( stats.isDirectory() ) {
			// If it's a symlinked dir, we need to convert it to a real dir.
			// Suppose linked-foo/ is a symlink of foo/, and we try to copy
			// the contents of bar/ into linked-foo/ - those files will end
			// up in foo, which is definitely not what we want
			return lstat( dest )
				.then( stats => {
					if ( stats.isSymbolicLink() ) {
						return convertToRealDir( dest );
					}
				})
				.then( () => {
					return readdir( src ).then( files => {
						const promises = files.map( filename =>
							mergeDirectories( src + sep + filename, dest + sep + filename )
						);

						return Promise.all( promises );
					});
				});
		}

		// exists, and is file - overwrite
		return unlink( dest ).then( link );
	}, link ); // <- failed to stat, means dest doesn't exist

	function link () {
		return symlinkOrCopy( src ).to( dest );
	}
}

// TODO make this async
function convertToRealDir ( symlinkPath ) {
	const originalPath = realpathSync( symlinkPath );

	unlinkSync( symlinkPath );
	mkdirSync( symlinkPath );

	readdirSync( originalPath ).forEach( filename => {
		symlinkOrCopySync( originalPath, filename ).to( symlinkPath, filename );
	});
}

export default class Merger extends Node {
	constructor ( inputs, options ) {
		super();

		this.inputs = inputs;
		this.id = uid( ( options && options.id ) || 'merge' );

		this._oninvalidate = changes => {
			this._abort( changes );
			this.emit( 'invalidate', changes );
		};

		this._oninfo = details => this.emit( 'info', details );

		this.inputs.forEach( input => {
			input.on( 'invalidate', this._oninvalidate );
			input.on( 'info', this._oninfo );
		});
	}

	ready () {
		let aborted;
		let index;
		let outputdir;

		if ( !this._ready ) {
			this._abort = () => {
				// allows us to short-circuit operations at various points
				aborted = true;
				this._ready = null;
			};

			index = this.counter++;
			outputdir = resolve( session.config.gobbledir, this.id, '' + index );

			this._ready = mkdir( outputdir ).then( () => {
				let start;
				let inputdirs = [];

				return mapSeries( this.inputs, function ( input, i ) {
					if ( aborted ) throw ABORTED;
					return input.ready().then( inputdir => inputdirs[i] = inputdir );
				}).then( () => {
					start = Date.now();

					this.emit( 'info', {
						code: 'MERGE_START',
						id: this.id,
						progressIndicator: true
					});

					return mapSeries( inputdirs, inputdir => {
						if ( aborted ) throw ABORTED;
						return mergeDirectories( inputdir, outputdir );
					});
				}).then( () => {
					if ( aborted ) throw ABORTED;

					this._cleanup( index );

					this.emit( 'info', {
						code: 'MERGE_COMPLETE',
						id: this.id,
						duration: Date.now() - start
					});

					return outputdir;
				});
			});
		}

		return this._ready;
	}

	startFileWatcher () {
		this.inputs.forEach( input => input.startFileWatcher() );
	}

	stopFileWatcher () {
		this.inputs.forEach( input => input.stopFileWatcher() );
	}

	teardown () {
		this.inputs.forEach( input => {
			input.off( 'invalidate', this._oninvalidate );
			input.off( 'info', this._oninfo );
			input.teardown();
		});
	}

	_cleanup ( index ) {
		const dir = join( session.config.gobbledir, this.id );

		// Remove everything except the last successful output dir.
		// Use readdirSync to eliminate race conditions
		readdirSync( dir )
			.filter( file => file !== '.cache' && ( +file < index ) )
			.forEach( file => rimrafSync( dir, file ) );
	}

	_findCreator ( filename ) {
		let i = this.inputs.length;
		let node;

		while ( i-- ) {
			node = this.inputs[i];
			if ( node._findCreator( filename ) ) {
				return node;
			}
		}

		return null;
	}
}
