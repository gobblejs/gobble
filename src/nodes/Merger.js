import { join, resolve } from 'path';
import { mkdir, readdirSync, rimrafSync } from 'sander';
import * as mapSeries from 'promise-map-series';
import Node from './Node';
import session from '../session';
import merge from '../file/merge';
import uid from '../utils/uid';
import GobbleError from '../utils/GobbleError';

export default class Merger extends Node {
	constructor ( inputs, options ) {
		super();

		this.inputs = inputs;
		this.id = uid( ( options && options.id ) || 'merge' );
	}

	ready () {
		var aborted, index, outputdir;

		if ( !this._ready ) {
			this._abort = () => {
				// allows us to short-circuit operations at various points
				aborted = new GobbleError({
					code: 'MERGE_ABORTED',
					id: this.id,
					message: 'merge aborted'
				});

				this._ready = null;
			};

			index = this.counter++;
			outputdir = resolve( session.config.gobbledir, this.id, '' + index );

			this._ready = mkdir( outputdir ).then( () => {
				var start, inputdirs = [];

				return mapSeries( this.inputs, function ( input, i ) {
					if ( aborted ) throw aborted;

					return input.ready().then( function ( inputdir ) {
						inputdirs[i] = inputdir;
					});
				}).then( () => {
					start = Date.now();

					this.emit( 'info', {
						code: 'MERGE_START',
						id: this.id,
						progressIndicator: true
					});

					return mapSeries( inputdirs, inputdir => {
						if ( aborted ) {
							throw aborted;
						}

						return merge( inputdir ).to( outputdir );
					});
				}).then( () => {
					if ( aborted ) throw aborted;

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

	start () {
		if ( this._active ) {
			return;
		}

		this._active = true;

		this._onerror = err => {
			this._abort();
			this.emit( 'error', err );
		};

		this._oninfo = details => {
			this.emit( 'info', details );
		};

		this.inputs.forEach( input => {
			input.on( 'error', this._onerror );
			input.on( 'info', this._oninfo );

			input.start();
		});
	}

	stop () {
		this.inputs.forEach( input => {
			input.off( 'error', this._onerror );
			input.off( 'info', this._oninfo );

			input.stop();
		});

		this._active = false;
	}

	_cleanup ( index ) {
		var dir = join( session.config.gobbledir, this.id );

		// Remove everything except the last successful output dir.
		// Use readdirSync to eliminate race conditions
		readdirSync( dir )
			.filter( file => file !== '.cache' && ( +file < index ) )
			.forEach( file => rimrafSync( dir, file ) );
	}

	_findCreator ( filename ) {
		var i = this.inputs.length, node;
		while ( i-- ) {
			node = this.inputs[i];
			if ( node._findCreator( filename ) ) {
				return node;
			}
		}

		return null;
	}
}
