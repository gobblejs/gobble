var path = require( 'path' ),
	uid = require( './utils/uid' ),
	helpers = require( './helpers' ),
	cwd = require( './cwd' ),
	debug = require( './utils/debug' ),
	throttle = require( './utils/throttle' ),
	Promise = require( 'promo' ).Promise;

var Node = function ( input, transformer, options ) {
	var node = this;

	node.input = input;
	node.callbacks = [];
	node.transformer = transformer;
	node.options = options || {};

	node.id = uid( transformer.id || transformer.name || 'yabl' );
	node.outputDir = path.join( cwd(), '.yabl', node.id );
};

Node.prototype = {
	// This gets overwritten each time this.ready is overwritten. Until
	// the first time that happens, it's a noop
	_abort: function () {},

	ready: function () {
		var node = this;

		if ( !node._ready ) {
			node._ready = new Promise( function ( fulfil, reject ) {
				node._abort = function ( err ) {
					reject( err );
					node._ready = null;
				};

				node.input.ready().then( function ( srcDir ) {
					node.transformer( srcDir, node.outputDir, node.options, function ( err ) {
						console.log( 'node transformer called back', err, node.outputDir );

						if ( err ) {
							// propagate errors synchronously
							i = node.callbacks.length;
							while ( i-- ) {
								node.callbacks[i]( err, node.outputDir );
							}

							return reject( err );
						}

						fulfil( node.outputDir );
					});
				}).catch( debug );
			});
		}

		return node._ready;
	},

	copyTo: function ( dest ) {

	},

	transform: function ( transformer, options ) {
		var node = new Node( this, transformer, options );
		return node;
	},

	map: function ( fn ) {
		var node, transformer;

		transformer = function ( srcDir, destDir, done, helpers ) {
			helpers.glob( path.join( srcDir, '**' ) ).then( function ( files ) {
				var promises;

				promises = files.map( function ( file ) {
					return helpers.stat( file ).then( function ( stats ) {
						if ( stats.isDirectory() ) {
							return;
						}

						return helpers.read( file ).then( function ( data ) {
							var result = fn( data.toString() );
							return helpers.write( file.replace( srcDir, destDir ), result );
						});
					});
				});

				return Promise.all( promises ).then( done );
			}).catch( debug );
		};

		node = new Node([ this ], transformer );
		return node;
	},

	ls: function () {
		return this.ready().then( function ( outputDir ) {
			console.log( 'lsing', outputDir );
			return helpers.ls( outputDir );
		});
	},

	watch: function ( callback ) {
		var node = this;

		helpers.mkdirp( node.outputDir ).then( function () {
			var incoming, outgoing;

			// If this node isn't already in watching mode, it needs to be...
			if ( !node.watching ) {
				incoming = function ( err, srcDir ) {
					var done;

					if ( err ) {
						node.error = err;
						return outgoing( err );
					}

					node.error = null;

					node._abort();
					node.ready().then( outgoing );
				};

				outgoing = throttle( function () {
					var i;

					// If an error happened during transformation, don't do
					// anything. The error has already been propagated synchronously
					if ( node.error ) {
						return;
					}

					i = node.callbacks.length;
					while ( i-- ) {
						node.callbacks[i]( null, node.outputDir );
					}
				});

				node.input.watch( incoming );
				node.watching = true;
			}
		}).catch( debug );

		node.callbacks.push( callback );
	},

	export: function ( dest ) {
		var node = this;

		helpers.mkdirp( dest ).then( function () {
			return input.copyTo( dest ).then( function () {
				console.log( 'Exported tree to ' + dest );
			});
		}).catch( debug );

		return node; // chainable
	}
};

Node.prototype.constructor = Node;
module.exports = Node;
