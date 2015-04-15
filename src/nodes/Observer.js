import * as sander from 'sander';
import Node from './Node';
import queue from '../queue';
import GobbleError from '../utils/GobbleError';
import assign from '../utils/assign';
import uid from '../utils/uid';
import makeLog from '../utils/makeLog';
import config from '../config';
import extractLocationInfo from '../utils/extractLocationInfo';
import { ABORTED } from '../utils/signals';

export default class Observer extends Node {
	constructor ( input, fn, options, id ) {
		super();

		this.input = input;

		this.fn = fn;
		this.options = assign( {}, options );

		this.name = id || fn.id || fn.name || 'unknown';
		this.id = uid( this.name );
	}

	getSourcemaps () {
		return this.input.getSourcemaps();
	}

	ready () {
		let observation;

		if ( !this._ready ) {
			observation = {
				node: this,
				log: makeLog( this ),
				env: config.env,
				sander: sander
			};

			this._abort = () => {
				this._ready = null;
				observation.aborted = true;
			};

			this._ready = this.input.ready().then( inputdir => {
				return queue.add( ( fulfil, reject ) => {
					this.emit( 'info', {
						code: 'TRANSFORM_START', // TODO
						progressIndicator: true,
						id: this.id
					});

					const start = Date.now();
					let called = false;

					const callback = err => {
						if ( called ) return;
						called = true;

						if ( observation.aborted ) {
							reject( ABORTED );
						}

						else if ( err ) {
							let stack = err.stack || new Error().stack;
							let { file, line, column } = extractLocationInfo( err );

							let gobbleError = new GobbleError({
								inputdir,
								stack, file, line, column,
								message: 'observation failed',
								id: this.id,
								code: 'TRANSFORMATION_FAILED', // TODO
								original: err
							});

							reject( gobbleError );
						}

						else {
							this.emit( 'info', {
								code: 'TRANSFORM_COMPLETE', // TODO
								id: this.id,
								duration: Date.now() - start
							});

							fulfil( inputdir );
						}
					};

					try {
						observation.changes = this.input.changes || this.getChanges( inputdir );

						const promise = this.fn.call( observation, inputdir, assign({}, this.options ), callback );
						const promiseIsPromise = promise && typeof promise.then === 'function';

						if ( !promiseIsPromise && this.fn.length < 3 ) {
							throw new Error( `Observer ${this.id} did not return a promise and did not accept callback` );
						}

						if ( promiseIsPromise ) {
							promise.then( () => callback(), callback );
						}
					} catch ( err ) {
						callback( err );
					}
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

		return this.input.start();
	}

	stop () {
		this.input.off( 'invalidate', this._oninvalidate );
		this.input.off( 'info', this._oninfo );

		this.input.stop();
		this._active = false;
	}
}
