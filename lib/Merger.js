var path = require( 'path' ),
	Node = require( './Node' ),
	mapSeries = require( 'promise-map-series' ),
	Promise = require( 'promo' ).Promise,

	file = require( './file' ),
	cwd = require( './cwd' ),
	debug = require( './utils/debug' ),
	throttle = require( './utils/throttle' ),
	assign = require( './utils/assign' ),
	uid = require( './utils/uid' );

var Merger = function ( inputs, id ) {
	var node = this;

	node.inputs = inputs;
	node.errors = [];

	node.callbacks = [];

	node.id = uid( id || 'merge' );
	node.outputDir = path.join( cwd(), '.gobble', node.id );

	node.counter = 1;
};

Merger.prototype = assign( Object.create( Node.prototype ), {
	ready: function () {
		var node = this, outputDir;

		if ( !node._ready ) {
			outputDir = path.join( node.outputDir, '' + node.counter++ );
			node._ready = file.mkdirp( outputDir ).then( function () {
				return new Promise( function ( fulfil, reject ) {
					node._abort = function ( err ) {
						reject( outputDir );
						node._ready = null;
					};

					mapSeries( node.inputs, function ( input, i ) {
						return input.ready().then( function ( inputDir ) {
							return file.copydir( inputDir, outputDir );
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
		var node = this, relay, propagateError;

		node.callbacks.push( callback );

		node.ready().then( function ( outputDir ) {
			callback( null, outputDir );
		});

		// If this node isn't already in watching mode, it needs to be...
		if ( !node.watching ) {
			relay = function ( outputDir ) {
				node._relay( null, outputDir );
			};

			node.inputs.forEach( function ( input, i ) {
				input.watch( function ( err, outputDir ) {
					node._abort( 'merger inputs invalidated' );
					node.ready().then( relay );
				});
			});

			node.watching = true;
		}
	}
});

Merger.prototype.constructor = Merger;
module.exports = Merger;
