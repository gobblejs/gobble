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
	node.outputDir = path.resolve( config.gobbledir, node.id );

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
			outputDir = path.resolve( node.outputDir, '' + node.counter++ );
			node._ready = file.mkdirp( outputDir ).then( function () {
				return new Promise( function ( fulfil, reject ) {
					node._abort = function () {
						reject();
						node._ready = null;
					};

					node.input.ready().then( function ( inputDir ) {
						node.transformer( inputDir, outputDir, node.options, function ( err ) {
							if ( err ) {
								logger.error( 'Transformation failed ({id}): {message}', { id: node.id, message: err.message || err });
								console.trace( err );

								// propagate errors synchronously
								i = node.callbacks.length;
								while ( i-- ) {
									node.callbacks[i]({
										original: err,
										id: node.id,
										stack: err.stack || new Error().stack
									});
								}

								return reject();
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

	grab: function () {
		var src = path.join.apply( path, arguments );
		return new Node( this, builtins.grab, { src: src });
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
		}, fn.id || fn.name );
	},

	watch: function ( callback, options ) {
		var node = this;

		file.mkdirp( node.outputDir ).then( function () {
			var relay;

			// If this node isn't already in watching mode, it needs to be...
			if ( !node._watcher && ( !options || options.silent === false ) ) {
				relay = function ( outputDir ) {
					node._relay( null, outputDir );
				};

				node._watcher = node.input.watch( function ( err, srcDir ) {
					if ( err ) {
						node._relay( err );
					}

					node._abort();
					node.ready().then( relay );
				});
			}
		}).catch( logger.error );

		node.callbacks.push( callback );

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

			if ( !callbacks.length && this._watcher ) {
				this._watcher.cancel();
				this._watcher = null;
			}
		}
	},

	inspect: function ( dest, options ) {
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
			err.gobbled = true;
		} else {
			logger.error( 'error loading gobble-{name}: ' + err.message || err, { name: plugin });
			err.gobbled = true;
		}
		throw err;
	}
}
