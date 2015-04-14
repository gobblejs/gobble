import { join, resolve } from 'path';
import { mkdir, readdirSync, rimrafSync } from 'sander';
import * as mapSeries from 'promise-map-series';
import Node from './Node';
import session from '../session';
import merge from '../file/merge';
import uid from '../utils/uid';
import extend from '../utils/extend';
import { ABORTED } from '../utils/signals';

export default class Merger extends Node {
	constructor ( inputs, options ) {
		super();

		this.inputs = inputs;
		this.id = uid( ( options && options.id ) || 'merge' );
	}

	getSourcemaps () {
		return extend( {}, ...this.inputs.map( input => input.getSourcemaps() ) );
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
						return merge( inputdir ).to( outputdir );
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

	start () {
		if ( this._active ) return;
		this._active = true;

		this._oninvalidate = changes => {
			this._abort( changes );
			this.emit( 'invalidate', changes );
		};

		this._oninfo = details => this.emit( 'info', details );

		this.inputs.forEach( input => {
			input.on( 'invalidate', this._oninvalidate );
			input.on( 'info', this._oninfo );

			input.start();
		});
	}

	stop () {
		this.inputs.forEach( input => {
			input.off( 'invalidate', this._oninvalidate );
			input.off( 'info', this._oninfo );

			input.stop();
		});

		this._active = false;
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
