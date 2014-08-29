var fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	Node = require( './Node' ),
	mapSeries = require( 'promise-map-series' ),
	Promise = require( 'promo' ).Promise,

	file = require( './file' ),
	tmpDir = require( './config/tmpDir' ),
	assign = require( './utils/assign' ),
	uid = require( './utils/uid' );

var Merger = function ( inputs, options ) {
	var node = this;

	node.inputs = inputs;
	node.errors = [];

	node.callbacks = [];
	node.inspectTargets = [];

	node.id = uid( ( options && options.id ) || 'merge' );
	node.outputDir = path.resolve( tmpDir(), node.id );

	node.counter = 1;
};

Merger.prototype = assign( Object.create( Node.prototype ), {
	ready: function () {
		var node = this, outputDir;

		if ( !node._ready ) {
			outputDir = node._lastOutputDir = path.resolve( node.outputDir, '' + node.counter++ );
			node._ready = file.mkdirp( outputDir ).then( function () {
				return new Promise( function ( fulfil, reject ) {
					node._abort = function ( err ) {
						reject( err );
						node._ready = null;
					};

					mapSeries( node.inputs, function ( input ) {
						return input.ready().then( function ( inputDir ) {
							return file.merge( inputDir ).to( outputDir );
						});
					}).then( function () {
						fulfil( outputDir );
					}, reject );
				});
			});
		}

		return node._ready;
	},

	watch: function ( callback ) {
		var node = this, relay;

		node.callbacks.push( callback );

		// If this node isn't already in watching mode, it needs to be...
		if ( !node._watchers ) {
			relay = function ( outputDir ) {
				node._relay( null, outputDir );
			};

			node._watchers = node.inputs.map( function ( input ) {
				return input.watch( function ( err, dir ) {
					if ( err ) {
						node._relay( err );
					}

					node._abort( err || { code: 'BUILD_INVALIDATED' });

					if ( dir ) {
						node.ready().then( relay );
					}
				});
			});
		}

		return {
			cancel: function () {
				node.unwatch( callback );
			}
		};
	},

	unwatch: function ( callback ) {
		var callbacks = this.callbacks, index = callbacks.indexOf( callback );

		if ( ~callbacks.indexOf( callback ) ) {
			callbacks.splice( index, 1 );

			if ( !callbacks.length && this._watchers ) {
				this._watchers.forEach( function ( watcher ) {
					watcher.cancel();
				});
				this._watchers = null;
			}
		}
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

	_cleanup: function () {
		var node = this;

		// Remove everything except the last successful output dir.
		// Use readdirSync to eliminate race conditions
		fs.readdirSync( node.outputDir ).map( function ( dir ) {
			return path.resolve( node.outputDir, dir );
		}).filter( function ( dirpath ) {
			return dirpath !== node._lastOutputDir;
		}).forEach( function ( dirpath ) {
			file.rimraf( dirpath );
		});

		node.inputs.forEach( function ( input ) {
			input._cleanup();
		});
	}
});

Merger.prototype.constructor = Merger;
module.exports = Merger;
