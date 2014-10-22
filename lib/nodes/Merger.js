var path = require( 'path' ),
	sander = require( 'sander' ),
	mapSeries = require( 'promise-map-series' ),
	Node = require( './Node' ),

	session = require( '../session' ),

	merge = require( '../file/merge' ),
	uid = require( '../utils/uid' );

module.exports = Node.extend({
	init: function ( inputs, options ) {
		var node = this;

		node.inputs = inputs;

		node.inspectTargets = [];
		node.id = uid( ( options && options.id ) || 'merge' );

		node.counter = 1;
	},

	ready: function () {
		var node = this, index, outputdir;

		if ( !node._ready ) {
			index = node.counter++;
			outputdir = path.resolve( session.config.gobbledir, node.id, '' + index );

			node._ready = sander.mkdir( outputdir ).then( function () {
				var start, inputdirs = [];

				node._abort = function ( err ) {
					node._ready = null;
				};

				return mapSeries( node.inputs, function ( input, i ) {
					return input.ready().then( function ( inputdir ) {
						inputdirs[i] = inputdir;
					});
				}).then( function () {
					start = Date.now();

					node.emit( 'info', {
						code: 'MERGE_START',
						id: node.id
					});

					return mapSeries( inputdirs, function ( inputdir ) {
						return merge( inputdir ).to( outputdir );
					});
				}).then( function () {
					node._cleanup( index );

					node.emit( 'info', {
						code: 'MERGE_END',
						id: node.id,
						duration: Date.now() - start
					});

					return outputdir;
				});
			});
		}

		return node._ready;
	},

	start: function () {
		var node = this;

		if ( node._active ) {
			return;
		}

		node._active = true

		node._onerror = function ( err ) {
			node._abort();
			node.emit( 'error', err );
		};

		node._oninfo = function ( details ) {
			node.emit( 'info', details );
		};

		node.inputs.forEach( function ( input ) {
			input.on( 'error', node._onerror );
			input.on( 'info', node._oninfo );

			input.start();
		});
	},

	stop: function () {
		var node = this;

		node.inputs.forEach( function ( input ) {
			input.off( 'error', node._onerror );
			input.off( 'info', node._oninfo );

			input.stop();
		});

		node._active = false;
	},

	_findCreator: function ( filename ) {
		var i = this.inputs.length, node;
		while ( i-- ) {
			node = this.inputs[i];
			if ( node._findCreator( filename ) ) {
				return node;
			}
		}

		return null;
	},

	_cleanup: function ( index ) {
		var node = this, dir = path.join( session.config.gobbledir, node.id );

		// Remove everything except the last successful output dir.
		// Use readdirSync to eliminate race conditions
		sander.readdirSync( dir ).filter( function ( file ) {
			return file !== '.cache' && ( +file < index );
		}).forEach( function ( file ) {
			sander.rimrafSync( dir, file );
		});
	}
});
