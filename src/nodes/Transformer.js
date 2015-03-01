import { join, resolve } from 'path';
import * as crc32 from 'buffer-crc32';
import * as sander from 'sander';
import { lsrSync, mkdir, readFileSync, readdirSync, rimrafSync } from 'sander';
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

export default class Transformer extends Node {
	constructor ( input, transformer, options, id ) {
		super();

		this.input = input;

		this.transformer = transformer;
		this.options = assign( {}, options );

		this.name = id || transformer.id || transformer.name || 'unknown';
		this.id = uid( this.name );

		// Double callback style deprecated as of 0.6.x. TODO remove this eventually
		if ( transformer.length === 5 ) {
			warnOnce( 'The gobble plugin API has changed - the "%s" transformer should take a single callback. See https://github.com/gobblejs/gobble/wiki/Troubleshooting for more info', this.name );

			this.transformer = ( inputdir, outputdir, options, callback ) => {
				return transformer.call( this, inputdir, outputdir, options, function () {
					callback();
				}, callback );
			};
		}
	}

	ready () {
		var outputdir, transformation;

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

			this._ready = mkdir( outputdir ).then( () => {
				return this.input.ready().then( inputdir => {
					return queue.add( ( fulfil, reject ) => {
						var promise, called, callback, start;

						this.emit( 'info', {
							code: 'TRANSFORM_START',
							progressIndicator: true,
							id: this.id
						});

						start = Date.now();

						callback = err => {
							if ( called ) {
								return;
							}

							called = true;

							if ( err ) {
								let stack = err.stack || new Error().stack;
								let { file, line, column } = extractLocationInfo( err );

								let gobbleError = new GobbleError({
									message: 'transformation failed',
									id: this.id,
									code: 'TRANSFORMATION_FAILED',
									original: err,
									stack, file, line, column
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

							promise = this.transformer.call( transformation, inputdir, outputdir, assign({}, this.options ), callback );

							if ( promise && typeof promise.then === 'function' ) {
								promise.then( () => callback(), callback );
							}
						} catch ( err ) {
							callback( err );
						}
					});
				}).catch( err => {
					this._abort();
					queue.abort();

					throw err;
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

		// Propagate errors and information
		this._onerror = err => {
			this._abort();
			this.emit( 'error', err );
		};

		this._oninfo = details => {
			this.emit( 'info', details );
		};

		this.input.on( 'error', this._onerror );
		this.input.on( 'info', this._oninfo );

		mkdir( session.config.gobbledir, this.id ).then( () => {
			this.input.start();
		}).catch( err => {
			this.emit( 'error', err );
		});
	}

	stop () {
		this.input.off( 'error', this._onerror );
		this.input.off( 'info', this._oninfo );

		this.input.stop();
		this._active = false;
	}

	getChanges ( inputdir ) {
		let files = lsrSync( inputdir );

		if ( !this._files ) {
			this._files = files;
			this._checksums = {};

			files.forEach( file => {
				this._checksums[ file ] = crc32( readFileSync( inputdir, file ) );
			});

			return files.map( file => ({ file, added: true }) );
		}

		let added = files.filter( file => !~this._files.indexOf( file ) ).map( file => ({ file, added: true }) );
		let removed = this._files.filter( file => !~files.indexOf( file ) ).map( file => ({ file, removed: true }) );

		let maybeChanged = files.filter( file => ~this._files.indexOf( file ) );

		let changed = [];

		maybeChanged.forEach( file => {
			let checksum = crc32( readFileSync( inputdir, file ) );
			if ( checksum !== this._checksums[ file ] ) {
				changed.push({ file, changed: true });
				this._checksums[ file ] = checksum;
			}
		});

		return added.concat( removed ).concat( changed );
	}

	_cleanup ( latest ) {
		let dir = join( session.config.gobbledir, this.id );

		// Remove everything except the last successful outputdir and the cachedir
		// Use readdirSync to eliminate race conditions
		readdirSync( dir )
			.filter( file => file !== '.cache' && resolve( dir, file ) !== latest )
			.forEach( file => rimrafSync( dir, file ) );
	}
}
