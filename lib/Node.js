/*global console */
var path = require( 'path' ),
	requireRelative = require( 'require-relative' ),
	uid = require( './utils/uid' ),
	file = require( './file' ),
	tmpDir = require( './config/tmpDir' ),
	Promise = require( 'promo' ).Promise,
	builtins = require( './builtins' ),
	build = require( './build' ),
	serve = require( './serve' ),
	messenger = require( './messenger' ),
	GobbleError = require( './utils/GobbleError' );

var Node = function ( input, transformer, options, id ) {
	var node = this;

	node.input = input;
	node.callbacks = [];
	node.inspectTargets = [];
	node.transformer = transformer;
	node.options = options || {};

	node.id = uid( id || transformer.id || transformer.name || 'gobble' );
	node.outputDir = path.resolve( tmpDir(), node.id );

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
					var transformation = {
						node: node
					}, i;

					node._abort = function () {
						reject();
						node._ready = null;
						transformation.aborted = true;
					};

					node.input.ready().then( function ( inputDir ) {
						var done, err;

						done = function () {
							fulfil( outputDir );
						};

						err = function ( err ) {
							messenger.error( 'Transformation failed (%s)', node.id );
							console.log( '============'.grey );
							console.log( err.message || err );
							console.log( '------------'.grey );
							console.log( 'stack trace:' );
							console.log( err.stack );
							console.log( '============\n\n'.grey );

							// propagate errors synchronously
							i = node.callbacks.length;
							while ( i-- ) {
								node.callbacks[i]({
									original: err,
									id: node.id,
									stack: err.stack || new Error().stack
								});
							}

							reject();
						};

						node.transformer.call( transformation, inputDir, outputDir, node.options, done, err );
					}).catch( messenger.error );
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

		if ( !err ) {
			i = this.inspectTargets.length;
			while ( i-- ) {
				file.copydir( outputDir ).to( this.inspectTargets[i] );
			}
		}
	},

	transform: function ( transformer, options ) {
		if ( typeof transformer === 'string' ) {
			transformer = tryToLoad( transformer );
		}

		if ( transformer.length !== 4 ) {
			messenger.warn( 'Wrong function length - did you mean to use tree.map() instead of tree.transform()? See https://github.com/gobblejs/gobble/wiki/Troubleshooting for more information' );
		}

		return new Node( this, transformer, options );
	},

	// Built-in transformers
	include: function ( patterns ) {
		if ( typeof patterns === 'string' ) { patterns = [ patterns ]; }
		return new Node( this, builtins.include, { patterns: patterns });
	},

	exclude: function ( patterns ) {
		if ( typeof patterns === 'string' ) { patterns = [ patterns ]; }
		return new Node( this, builtins.include, { patterns: patterns, exclude: true });
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
			messenger.warn( 'Wrong function length - did you mean to use tree.transform() instead of tree.map()? See https://github.com/gobblejs/gobble/wiki/Troubleshooting for more information' );
		}

		options = options || {};
		defaults = fn.defaults || {};
		accept =  options.accept || defaults.accept;

		if ( accept && typeof accept === 'string' ) {
			accept = [ accept ];
		}

		return new Node( this, builtins.map, {
			cache: {},
			fn: fn,
			options: options || {},
			accept: accept,
			ext: options.ext || defaults.ext
		}, fn.id || fn.name );
	},

	watch: function ( callback ) {
		var node = this;

		node.callbacks.push( callback );

		file.mkdirp( node.outputDir ).then( function () {
			var relay;

			// If this node isn't already in watching mode, it needs to be...
			if ( !node._watcher ) {
				relay = function ( outputDir ) {
					node._relay( null, outputDir );
				};

				node._watcher = node.input.watch( function ( err ) {
					if ( err ) {
						node._relay( err );
					}

					node._abort();
					node.ready().then( relay );
				});
			}
		}).catch( messenger.error );

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

			if ( !callbacks.length && this._watcher ) {
				this._watcher.cancel();
				this._watcher = null;
			}
		}
	},

	inspect: function ( target, options ) {
		if ( options && options.clean ) {
			file.rimraf( target );
		}

		this.inspectTargets.push( path.resolve( process.cwd(), target ) );
		return this; // chainable
	},

	_findCreator: function () {
		return this;
	},

	build: function ( options ) {
		return build( this, options );
	},

	serve: function ( options ) {
		return serve( this, options );
	}
};

Node.prototype.constructor = Node;
module.exports = Node;


function tryToLoad ( plugin ) {
	var gobbleError;

	try {
		return requireRelative( 'gobble-' + plugin, process.cwd() );
	} catch ( err ) {
		if ( err.message === "Cannot find module 'gobble-" + plugin + "'" ) {
			gobbleError = new GobbleError({
				message: 'Could not load gobble-' + plugin + ' plugin',
				code: 'PLUGIN_NOT_FOUND',
				plugin: plugin
			});

			throw gobbleError;
		} else {
			throw err;
		}
	}
}
