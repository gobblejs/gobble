var path = require( 'path' ),
	Node = require( './Node' ),
	mapSeries = require( 'promise-map-series' ),
	Promise = require( 'promo' ).Promise,

	helpers = require( './helpers' ),
	cwd = require( './cwd' ),
	debug = require( './utils/debug' ),
	throttle = require( './utils/throttle' ),
	assign = require( './utils/assign' ),
	uid = require( './utils/uid' );

var Merger = function ( inputs ) {
	var node = this;

	node.inputs = inputs;

	node.inputContentMaps = [];
	node.errors = [];

	node.callbacks = [];

	node.id = uid( 'merge' );
	node.outputDir = path.join( cwd(), '.yabl', node.id );
};

Merger.prototype = assign( Object.create( Node.prototype ), {
	_abort: function () {},

	ready: function () {
		var node = this;

		if ( !node._ready ) {
			node._ready = new Promise( function ( fulfil, reject ) {
				node._abort = function ( err ) {
					reject( err );
					node._ready = null;
				};

				mapSeries( node.inputs, function ( input, i ) {
					console.log( 'input', input.id );
					return input.ready().then( function ( srcDir ) {
						return input.ls().then( function ( files ) {
							var promises = [];

							console.log( input.id + ':', files );

							node.inputContentMaps[i] = toObject( files );

							files.forEach( function ( file ) {
								// If this file *isn't* in later inputs, we copy it
								if ( node.inputContentMaps.slice( i + 1 ).some( containsFile( file ) ) ) {
									return;
								}

								promise = helpers.copy( path.join( srcDir, file ), path.join( node.outputDir, file ) );
							});

							return Promise.all( promises );
						});
					});
				}).then( fulfil, reject );
			});
		}

		return node._ready;
	},

	watch: function ( callback ) {
		var node = this;

		helpers.mkdirp( node.outputDir ).then( function () {
			var incoming, outgoing, propagateError;

			// If this node isn't already in watching mode, it needs to be...
			if ( !node.watching ) {
				outgoing = throttle( function () {
					var i;

					// If an error happened during transformation, don't do
					// anything. The error has already been propagated synchronously
					if ( node.errors.some( Boolean ) ) {
						return;
					}

					i = node.callbacks.length;
					while ( i-- ) {
						node.callbacks[i]( null, node.outputDir );
					}
				});

				propagateError = function ( err ) {
					var i = node.callbacks.length;
					while ( i-- ) {
						node.callbacks[i]( err, node.outputDir );
					}
				};

				node.inputs.forEach( function ( input, i ) {
					input.watch( function ( err ) {
						if ( err ) {
							propagateError( err );
							node.errors[i] = err;
							return;
						}

						node.errors[i] = null;
						node._abort();

						node.ready().then( function ( outputDir ) {
							outgoing();
						}).catch( debug );
					});
				});
				node.watching = true;
			}
		}).catch( debug );

		node.callbacks.push( callback );
	},

	export: function ( dest ) {
		var node = this;

		console.log( 'exporting merger to', dest );

		mapSeries( this.inputs, function ( input ) {
			console.log( 'copying input to %s', dest, input );
			return input.copyTo( dest );
		});

		return node;
	}
});

Merger.prototype.constructor = Merger;
module.exports = Merger;


function toObject ( array ) {
	var obj = {};

	if ( array ) {
		array.forEach( function ( item ) {
			obj[ item ] = true;
		});
	}

	return obj;
}

function containsFile ( file ) {
	return function ( map ) {
		return map[ file ];
	};
}
