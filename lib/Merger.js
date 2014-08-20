var path = require( 'path' ),
	Node = require( './Node' ),
	mapSeries = require( 'promise-map-series' ),
	Promise = require( 'promo' ).Promise,

	file = require( './file' ),
	config = require( './config' ),
	throttle = require( './utils/throttle' ),
	assign = require( './utils/assign' ),
	uid = require( './utils/uid' );

var Merger = function ( inputs, options ) {
	var node = this;

	node.inputs = inputs;
	node.errors = [];

	node.callbacks = [];

	node.id = uid( ( options && options.id ) || 'merge' );
	node.outputDir = path.resolve( config.gobbledir, node.id );

	node.counter = 1;
};

Merger.prototype = assign( Object.create( Node.prototype ), {
	ready: function () {
		var node = this, outputDir;

		if ( !node._ready ) {
			outputDir = path.resolve( node.outputDir, '' + node.counter++ );
			node._ready = file.mkdirp( outputDir ).then( function () {
				return new Promise( function ( fulfil, reject ) {
					node._abort = function () {
						reject();
						node._ready = null;
					};

					mapSeries( node.inputs, function ( input, i ) {
						return input.ready().then( function ( inputDir ) {
							return file.copydir( inputDir ).to( outputDir );
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

		node.ready().then( function ( outputDir ) {
			callback( null, outputDir );
		});

		// If this node isn't already in watching mode, it needs to be...
		if ( !node._watchers ) {
			relay = function ( outputDir ) {
				node._relay( null, outputDir );
			};

			node._watchers = node.inputs.map( function ( input, i ) {
				return input.watch( function ( err, inputDir ) {
					if ( err ) {
						node._relay( err );
					}

					node._abort();
					node.ready().then( relay );
				});
			});
		}

		return {
			cancel: function () {
				node.unwatch( callback );
			}
		}
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
	}
});

Merger.prototype.constructor = Merger;
module.exports = Merger;
