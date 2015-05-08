import { join, resolve } from 'path';
import * as sander from 'sander';
import { mkdir, readdirSync, rimrafSync } from 'sander';
import Node from './Node';
import session from '../session';
import queue from '../queue';
import GobbleError from '../utils/GobbleError';
import assign from '../utils/assign';
import uid from '../utils/uid';
import makeLog from '../utils/makeLog';
import config from '../config';
import warnOnce from '../utils/warnOnce';
import extractLocationInfo from '../utils/extractLocationInfo';
import { ABORTED } from '../utils/signals';

export default class Transformer extends Node {
	constructor ( input, transformer, options, id ) {
		super();

		this.input = input;

		this.transformer = transformer;
		this.options = assign( {}, options );

		this.name = id || this.options.id || transformer.id || transformer.name || 'unknown';
		this.id = uid( this.name );

		// Double callback style deprecated as of 0.6.x. TODO remove this eventually
		if ( transformer.length === 5 ) {
			warnOnce( 'The gobble plugin API has changed - the "%s" transformer should take a single callback. See https://github.com/gobblejs/gobble/wiki/Troubleshooting for more info', this.name );

			this.transformer = ( inputdir, outputdir, options, callback ) => {
				return transformer.call( this, inputdir, outputdir, options, () => callback(), callback );
			};
		}
	}

	ready () {
		let outputdir;
		let transformation;

		if ( !this._ready ) {
			transformation = {
				node: this,
				cachedir: resolve( session.config.gobbledir, this.id, '.cache' ),
				log: makeLog( this ),
				env: config.env,
				sander: sander
			};

			this._abort = () => {
				this._ready = null;
				transformation.aborted = true;
			};

			outputdir = resolve( session.config.gobbledir, this.id, '' + this.counter++ );

			this._ready = this.input.ready().then( inputdir => {
				return mkdir( outputdir ).then( () => {
					return queue.add( ( fulfil, reject ) => {
						this.emit( 'info', {
							code: 'TRANSFORM_START',
							progressIndicator: true,
							id: this.id
						});

						const start = Date.now();
						let called = false;

						const callback = err => {
							if ( called ) return;
							called = true;

							if ( transformation.aborted ) {
								reject( ABORTED );
							}

							else if ( err ) {
								let stack = err.stack || new Error().stack;
								let { file, line, column } = extractLocationInfo( err );

								let gobbleError = new GobbleError({
									inputdir, outputdir,
									stack, file, line, column,
									message: 'transformation failed',
									id: this.id,
									code: 'TRANSFORMATION_FAILED',
									original: err
								});

								reject( gobbleError );
							}

							else {
								this.emit( 'info', {
									code: 'TRANSFORM_COMPLETE',
									id: this.id,
									duration: Date.now() - start
								});

								this._cleanup( outputdir );
								fulfil( outputdir );
							}
						};

						try {
							transformation.changes = this.input.changes || this.getChanges( inputdir );

							const promise = this.transformer.call( transformation, inputdir, outputdir, assign({}, this.options ), callback );

							if ( promise && typeof promise.then === 'function' ) {
								promise.then( () => callback(), callback );
							}
						} catch ( err ) {
							callback( err );
						}
					});
				});
			});
		}

		return this._ready;
	}

	start () {
		if ( this._active ) {
			return;
		}

		this._active = true;

		// Propagate invalidation events and information
		this._oninvalidate = changes => {
			this._abort();
			this.emit( 'invalidate', changes );
		};

		this._oninfo = details => this.emit( 'info', details );

		this.input.on( 'invalidate', this._oninvalidate );
		this.input.on( 'info', this._oninfo );

		return mkdir( session.config.gobbledir, this.id ).then( () => this.input.start() );
	}

	stop () {
		this.input.off( 'invalidate', this._oninvalidate );
		this.input.off( 'info', this._oninfo );

		this.input.stop();
		this._active = false;
	}

	active () {
		return this._active;
	}

	_cleanup ( latest ) {
		const dir = join( session.config.gobbledir, this.id );

		// Remove everything except the last successful outputdir and the cachedir
		// Use readdirSync to eliminate race conditions
		readdirSync( dir )
			.filter( file => file !== '.cache' && resolve( dir, file ) !== latest )
			.forEach( file => rimrafSync( dir, file ) );
	}
}
