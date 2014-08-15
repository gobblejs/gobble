var path = require( 'path' ),
	uid = require( './utils/uid' ),
	helpers = require( './helpers' ),
	cwd = require( './cwd' ),
	debug = require( './utils/debug' ),
	throttle = require( './utils/throttle' ),
	Promise = require( 'promo' ).Promise,
	builtins = require( './builtins' );

var Node = function ( input, transformer, options ) {
	var node = this;

	node.input = input;
	node.callbacks = [];
	node.transformer = transformer;
	node.options = options || {};

	node.id = uid( transformer.id || transformer.name || 'gobble' );
	node.outputDir = path.join( cwd(), '.gobble', node.id );

	node.counter = 1;
};

Node.prototype = {
	// This gets overwritten each time this.ready is overwritten. Until
	// the first time that happens, it's a noop
	_abort: function () {},

	ready: function () {
		var node = this, output;

		if ( !node._ready ) {
			output = path.join( node.outputDir, '' + node.counter++ );
			node._ready = helpers.mkdirp( output ).then( function () {
				return new Promise( function ( fulfil, reject ) {
					node._abort = function ( err ) {
						reject( err );
						node._ready = null;
					};

					node.input.ready().then( function ( srcDir ) {
						node.transformer( srcDir, output, node.options, function ( err ) {
							if ( err ) {
								// propagate errors synchronously
								i = node.callbacks.length;
								while ( i-- ) {
									node.callbacks[i]( err, output );
								}

								return reject( err );
							}

							fulfil( output );
						});
					}).catch( debug );
				});
			});
		}

		return node._ready;
	},

	relay: function ( err, outputDir ) {
		var i = this.callbacks.length;
		while ( i-- ) {
			this.callbacks[i]( err, outputDir );
		}
	},

	copyTo: function ( dest ) {
		return this.ready().then( function ( outputDir ) {
			return helpers.copydir( outputDir, dest );
		});
	},

	transform: function ( transformer, options ) {
		var node = new Node( this, transformer, options );
		return node;
	},

	// Built-in transformers
	include: function ( pattern ) {
		return new Node( this, builtins.include, { pattern: pattern });
	},

	exclude: function ( pattern ) {
		return new Node( this, builtins.exclude, { pattern: pattern });
	},

	map: function ( fn, options ) {
		return new Node( this, builtins.map, { fn: fn, options: options });
	},

	ls: function () {
		return this.ready().then( function ( outputDir ) {
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
						propagateError( err );

						return;
					}

					node.error = null;

					node._abort();
					outgoing();
				};

				outgoing = function () {
					// If an error happened during transformation, don't do
					// anything. The error has already been propagated synchronously
					if ( node.error ) {
						return;
					}

					node.ready().then( function ( outputDir ) {
						node.relay( null, outputDir );
					}).catch( debug );
				};

				propagateError = function ( err ) {
					var i = node.callbacks.length;
					while ( i-- ) {
						node.callbacks[i]( err, node.outputDir );
					}
				};

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
