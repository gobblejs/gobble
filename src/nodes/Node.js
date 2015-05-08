import { EventEmitter2 } from 'eventemitter2';
import * as crc32 from 'buffer-crc32';
import { copydir, lsrSync, readFileSync, rimraf } from 'sander';
import { join, resolve } from 'path';
import * as requireRelative from 'require-relative';
import { grab, include, map as mapTransform, move } from '../builtins';
import { Observer, Transformer } from './index';
import config from '../config';
import GobbleError from '../utils/GobbleError';
import flattenSourcemaps from '../utils/flattenSourcemaps';
import assign from '../utils/assign';
import warnOnce from '../utils/warnOnce';
import compareBuffers from '../utils/compareBuffers';
import serve from './serve';
import build from './build';
import watch from './watch';
import { isRegExp } from '../utils/is';
import { ABORTED } from '../utils/signals';
import session from '../session';

// TODO remove this in a future version
function enforceCorrectArguments ( options ) {
	if ( options !== undefined && typeof options !== 'object' ) {
		throw new Error( 'As of gobble 0.9.0, you cannot pass multiple strings to .grab() and .moveTo(). Use path.join() instead' );
	}
}

export default class Node extends EventEmitter2 {
	constructor () {
		this._gobble = true; // makes life easier for e.g. gobble-cli

		// initialise event emitter
		super({ wildcard: true });

		this.counter = 1;
		this.inspectTargets = [];
	}

	// This gets overwritten each time this.ready is overwritten. Until
	// the first time that happens, it's a noop
	_abort () {}

	_findCreator () {
		return this;
	}

	build ( options ) {
		return build( this, options );
	}

	createWatchTask ( dest ) {
		const node = this;
		const watchTask = new EventEmitter2({ wildcard: true });
		let uid = 1;

		// TODO is this the best place to handle this stuff? or is it better
		// to pass off the info to e.g. gobble-cli?
		let previousDetails;

		node.on( 'info', details => {
			if ( details === previousDetails ) return;
			previousDetails = details;
			watchTask.emit( 'info', details );
		});

		let buildScheduled;

		node.on( 'invalidate', changes => {
			// A node can depend on the same source twice, which will result in
			// simultaneous rebuilds unless we defer it to the next tick
			if ( !buildScheduled ) {
				buildScheduled = true;
				watchTask.emit( 'info', {
					changes,
					code: 'BUILD_INVALIDATED'
				});

				process.nextTick( build );
			}
		});

		node.on( 'error', handleError );

		function build () {
			buildScheduled = false;

			watchTask.emit( 'build:start' );

			node.ready()
				.then( outputdir => {
					watchTask.emit( 'build:end', outputdir );
				})
				.catch( handleError );
		}

		function handleError ( e ) {
			if ( e === ABORTED ) {
				// these happen shortly after an invalidation,
				// we can ignore them
				return;
			} else {
				watchTask.emit( 'error', e );
			}
		}

		watchTask.close = () => node.stop();

		this.start();
		process.nextTick( build );

		return watchTask;
	}

	exclude ( patterns, options ) {
		if ( typeof patterns === 'string' ) { patterns = [ patterns ]; }
		return new Transformer( this, include, { patterns, exclude: true, id: options && options.id });
	}

	getChanges ( inputdir ) {
		const files = lsrSync( inputdir );

		if ( !this._files ) {
			this._files = files;
			this._checksums = {};

			files.forEach( file => {
				this._checksums[ file ] = crc32( readFileSync( inputdir, file ) );
			});

			return files.map( file => ({ file, added: true }) );
		}

		const added = files.filter( file => !~this._files.indexOf( file ) ).map( file => ({ file, added: true }) );
		const removed = this._files.filter( file => !~files.indexOf( file ) ).map( file => ({ file, removed: true }) );

		const maybeChanged = files.filter( file => ~this._files.indexOf( file ) );

		let changed = [];

		maybeChanged.forEach( file => {
			let checksum = crc32( readFileSync( inputdir, file ) );

			if ( !compareBuffers( checksum, this._checksums[ file ] ) ) {
				changed.push({ file, changed: true });
				this._checksums[ file ] = checksum;
			}
		});

		return added.concat( removed ).concat( changed );
	}

	grab ( src, options ) {
		enforceCorrectArguments( options );
		return new Transformer( this, grab, { src, id: options && options.id });
	}

	// Built-in transformers
	include ( patterns, options ) {
		if ( typeof patterns === 'string' ) { patterns = [ patterns ]; }
		return new Transformer( this, include, { patterns, id: options && options.id });
	}

	inspect ( target, options ) {
		target = resolve( config.cwd, target );

		if ( options && options.clean ) {
			rimraf( target );
		}

		this.inspectTargets.push( target );
		return this; // chainable
	}

	map ( fn, userOptions ) {
		warnOnce( 'node.map() is deprecated. You should use node.transform() instead for both file and directory transforms' );
		return this.transform( fn, userOptions );
	}

	moveTo ( dest, options ) {
		enforceCorrectArguments( options );
		return new Transformer( this, move, { dest, id: options && options.id });
	}

	observe ( fn, userOptions ) {
		if ( typeof fn === 'string' ) {
			fn = tryToLoad( fn );
		}

		return new Observer( this, fn, userOptions );
	}

	observeIf ( condition, fn, userOptions ) {
		return condition ? this.observe( fn, userOptions ) : this;
	}

	serve ( options ) {
		return serve( this, options );
	}

	transform ( fn, userOptions ) {
		if ( typeof fn === 'string' ) {
			// TODO remove this for 0.9.0
			if ( fn === 'sorcery' ) {
				warnOnce( 'Sourcemaps are flattened automatically as of gobble 0.8.0. You should remove the sorcery transformation from your build definition' );
				return this;
			}

			fn = tryToLoad( fn );
		}

		// If function takes fewer than 3 arguments, it's a file transformer
		if ( fn.length < 3 ) {
			const options = assign( {}, fn.defaults, userOptions, {
				fn,
				cache: {},
				userOptions: assign( {}, userOptions )
			});

			if ( typeof options.accept === 'string' || isRegExp( options.accept ) ) {
				options.accept = [ options.accept ];
			}

			return new Transformer( this, mapTransform, options, fn.id || fn.name );
		}

		// Otherwise it's a directory transformer
		return new Transformer( this, fn, userOptions );
	}

	transformIf ( condition, fn, userOptions ) {
		return condition ? this.transform( fn, userOptions ) : this;
	}

	watch ( options ) {
		return watch( this, options );
	}
}

function tryToLoad ( plugin ) {
	try {
		return requireRelative( `gobble-${plugin}`, process.cwd() );
	} catch ( err ) {
		if ( err.message === `Cannot find module 'gobble-${plugin}'` ) {
			throw new GobbleError({
				message: `Could not load gobble-${plugin} plugin`,
				code: 'PLUGIN_NOT_FOUND',
				plugin: plugin
			});
		} else {
			throw err;
		}
	}
}
