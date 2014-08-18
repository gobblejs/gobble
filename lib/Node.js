var path = require( 'path' ),
	requireRelative = require( 'require-relative' ),
	uid = require( './utils/uid' ),
	file = require( './file' ),
	config = require( './config' ),
	assign = require( './utils/assign' ),
	throttle = require( './utils/throttle' ),
	Promise = require( 'promo' ).Promise,
	builtins = require( './builtins' ),
	logger = require( './logger' );

var Node = function ( input, transformer, options, id ) {
	var node = this;

	node.input = input;
	node.callbacks = [];
	node.transformer = transformer;
	node.options = options || {};

	node.id = uid( id || transformer.id || transformer.name || 'gobble' );
	node.outputDir = path.join( config.gobbledir, node.id );

	node.counter = 1;
};

Node.prototype = {
	_gobble: true, // way to identify gobble trees, even with different copies of gobble (i.e. local and global) running simultaneously

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
								logger.error( 'Transformation failed ({id}): {message}', { id: node.id, message: err.message || err });

								// propagate errors synchronously
								i = node.callbacks.length;
								while ( i-- ) {
									node.callbacks[i]( err, outputDir );
								}

								return reject( err );
							}

							fulfil( outputDir );
						});
					}).catch( logger.error );
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
			transformer = tryToLoad( transformer );
		}

		if ( transformer.length !== 4 ) {
			logger.warn( 'Wrong function length - did you mean to use tree.map() instead of tree.transform()? See https://github.com/gobblejs/gobble/wiki/Troubleshooting for more information' );
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

	moveTo: function () {
		var dest = path.join.apply( path, arguments );
		return new Node( this, builtins.move, { dest: dest });
	},

	map: function ( fn, options ) {
		var defaults, accept;

		if ( typeof fn === 'string' ) {
			fn = tryToLoad( fn );
		}

		if ( fn.length !== 2 ) {
			logger.warn( 'Wrong function length - did you mean to use tree.transform() instead of tree.map()? See https://github.com/gobblejs/gobble/wiki/Troubleshooting for more information' );
		}

		options = options || {};
		defaults = fn.defaults || {};
		accept =  options.accept || defaults.accept;

		if ( accept && typeof accept === 'string' ) {
			accept = [ accept ];
		}

		return new Node( this, builtins.map, {
			fn: fn,
			options: options || {},
			accept: accept,
			ext: options.ext || defaults.ext
		}, { id: fn.id || fn.name });
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
					}).catch( logger.error );
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
		}).catch( logger.error );

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


function tryToLoad ( plugin ) {
	try {
		return requireRelative( 'gobble-' + plugin, config.cwd );
	} catch ( err ) {
		if ( err.message === "Cannot find module 'gobble-" + plugin + "'" ) {
			logger.error( 'could not load {name} plugin. Have you done ' + 'npm install --save-dev gobble-{name}'.cyan + '?', { name: plugin });
		} else {
			logger.error( 'error loading gobble-{name}: ' + err.message || err, { name: plugin });
		}
		throw err;
	}
}
