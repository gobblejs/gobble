import { EventEmitter2 } from 'eventemitter2';
import { rimraf } from 'sander';
import { join, resolve } from 'path';
import * as requireRelative from 'require-relative';
import { grab, include, map as mapTransform, move } from '../builtins';
import { Transformer } from './index';
import config from '../config';
import GobbleError from '../utils/GobbleError';
import assign from '../utils/assign';
import warnOnce from '../utils/warnOnce';
import serve from './serve';
import build from './build';
import watch from './watch';
import { isRegExp } from '../utils/is';

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

	createWatchTask () {
		var node = this, watchTask, buildScheduled, previousDetails;

		watchTask = new EventEmitter2({ wildcard: true });

		// TODO is this the best place to handle this stuff? or is it better
		// to pass off the info to e.g. gobble-cli?
		node.on( 'info', details => {
			if ( details === previousDetails ) return;
			previousDetails = details;
			watchTask.emit( 'info', details );
		});

		node.on( 'error', handleError );

		function build () {
			var buildStart = Date.now();

			buildScheduled = false;

			node.ready().then( d => {
				watchTask.emit( 'info', {
					code: 'BUILD_COMPLETE',
					duration: Date.now() - buildStart,
					watch: true
				});

				watchTask.emit( 'built', d );
			}).catch( handleError );
		}

		function handleError ( e ) {
			if ( e.code === 'MERGE_ABORTED' ) {
				return;
			}

			if ( e.code === 'INVALIDATED' ) {
				// A node can depend on the same source twice, which will result in
				// simultaneous rebuilds unless we defer it to the next tick
				if ( !buildScheduled ) {
					buildScheduled = true;
					watchTask.emit( 'info', {
						code: 'BUILD_INVALIDATED',
						changes: e.changes
					});

					process.nextTick( build );
				}
			} else {
				watchTask.emit( 'error', e );
			}
		}

		watchTask.close = function () {
			node.stop();
		};

		this.start();
		build();

		return watchTask;
	}

	exclude ( patterns ) {
		if ( typeof patterns === 'string' ) { patterns = [ patterns ]; }
		return new Transformer( this, include, { patterns, exclude: true });
	}

	grab () {
		var src = join.apply( null, arguments );
		return new Transformer( this, grab, { src });
	}

	// Built-in transformers
	include ( patterns ) {
		if ( typeof patterns === 'string' ) { patterns = [ patterns ]; }
		return new Transformer( this, include, { patterns });
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

	moveTo () {
		var dest = join.apply( null, arguments );
		return new Transformer( this, move, { dest: dest });
	}

	serve ( options ) {
		return serve( this, options );
	}

	transform ( fn, userOptions ) {
		var options;

		if ( typeof fn === 'string' ) {
			fn = tryToLoad( fn );
		}

		// If function takes fewer than 3 arguments, it's a file transformer
		if ( fn.length < 3 ) {

			options = assign({}, fn.defaults, userOptions, {
				cache: {},
				fn: fn,
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

	watch ( options ) {
		return watch( this, options );
	}
}

function tryToLoad ( plugin ) {
	var gobbleError;

	try {
		return requireRelative( `gobble-${plugin}`, process.cwd() );
	} catch ( err ) {
		if ( err.message === `Cannot find module 'gobble-${plugin}'` ) {
			gobbleError = new GobbleError({
				message: `Could not load gobble-${plugin} plugin`,
				code: 'PLUGIN_NOT_FOUND',
				plugin: plugin
			});

			throw gobbleError;
		} else {
			throw err;
		}
	}
}
