var path = require( 'path' ),
	uid = require( './utils/uid' ),
	file = require( './file' ),
	cwd = require( './cwd' ),
	assign = require( './utils/assign' ),
	debug = require( './utils/debug' ),
	throttle = require( './utils/throttle' ),
	Promise = require( 'promo' ).Promise,
	builtins = require( './builtins' );

var Node = function ( input, transformer, options, id ) {
	var node = this;

	node.input = input;
	node.callbacks = [];
	node.transformer = transformer;
	node.options = options || {};

	node.id = uid( id || transformer.id || transformer.name || 'gobble' );
	node.outputDir = path.join( cwd(), '.gobble', node.id );

	node.counter = 1;
};

Node.prototype = {
	// This gets overwritten each time this.ready is overwritten. Until
	// the first time that happens, it's a noop
	_abort: function () {},

	ready: function () {
		var node = this, outputDir;

		if ( !node._ready ) {
			outputDir = path.join( node.outputDir, '' + node.counter++ );
			node._ready = file.mkdirp( outputDir ).then( function () {
				return new Promise( function ( fulfil, reject ) {
					node._abort = function ( err ) {
						reject( err );
						node._ready = null;
					};

					node.input.ready().then( function ( inputDir ) {
						node.transformer( inputDir, outputDir, node.options, function ( err ) {
							if ( err ) {
								// propagate errors synchronously
								i = node.callbacks.length;
								while ( i-- ) {
									node.callbacks[i]( err, outputDir );
								}

								return reject( err );
							}

							fulfil( outputDir );
						});
					}).catch( debug );
				});
			});
		}

		return node._ready;
	},

	_relay: function ( err, outputDir ) {
		var i = this.callbacks.length;
		while ( i-- ) {
			this.callbacks[i]( err, outputDir );
		}
	},

	transform: function ( transformer, options ) {
		if ( typeof transformer === 'string' ) {
			transformer = require( 'gobble-' + transformer );
		}

		return new Node( this, transformer, options );
	},

	// Built-in transformers
	include: function ( pattern ) {
		return new Node( this, builtins.include, { pattern: pattern });
	},

	exclude: function ( pattern ) {
		return new Node( this, builtins.include, { pattern: pattern, exclude: true });
	},

	map: function ( fn, options ) {
		var defaults;

		if ( typeof fn === 'string' ) {
			fn = require( 'gobble-' + fn );
		}

		options = options || {};
		defaults = fn.defaults || {};

		return new Node( this, builtins.map, {
			fn: fn,
			options: options.options || {},
			accept: options.accept || defaults.accept,
			ext: options.ext || defaults.ext
		}, fn.id || fn.name );
	},

	watch: function ( callback, options ) {
		var node = this;

		file.mkdirp( node.outputDir ).then( function () {
			var incoming, outgoing;

			// If this node isn't already in watching mode, it needs to be...
			if ( !node.watching && ( !options || options.silent === false ) ) {
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
						node._relay( null, outputDir );
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

	export: function ( dest, options ) {
		if ( options && options.clean ) {
			file.rimraf( dest );
		}

		this.watch( function ( err, outputDir ) {
			file.copydir( outputDir, dest );
		}, { silent: true });

		return this; // chainable
	}
};

Node.prototype.constructor = Node;
module.exports = Node;
