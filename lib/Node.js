var fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	sander = require( 'sander' ),
	requireRelative = require( 'require-relative' ),
	uid = require( './utils/uid' ),
	assign = require( './utils/assign' ),
	Promise = require( 'promo' ).Promise,
	builtins = require( './builtins' ),
	build = require( './build' ),
	serve = require( './serve' ),
	session = require( './session' ),
	GobbleError = require( './utils/GobbleError' ),
	queue = require( './queue' ),
	alreadyWarned = {}; // TODO remove this after a few versions...

var Node = function ( input, transformer, options, id ) {
	var node = this;

	node.input = input;
	node.callbacks = [];
	node.inspectTargets = [];
	node.transformer = transformer;
	node.options = assign( {}, options );

	node.name = id || transformer.id || transformer.name || 'unknown';
	node.id = uid( node.name );

	// Double callback style deprecated as of 0.6.x. TODO remove this eventually
	if ( transformer.length === 5 ) {
		warnOnce( 'The gobble plugin API has changed - the "%s" transformer should take a single callback. See https://github.com/gobblejs/gobble/wiki/Troubleshooting for more info', node.name );

		node.transformer = function ( inputdir, outputdir, options, callback ) {
			return transformer.call( this, inputdir, outputdir, options, function () {
				callback();
			}, callback );
		};
	}

	node.counter = 1;
};

Node.prototype = {
	_gobble: true, // way to identify gobble trees, even with different copies of gobble (i.e. local and global) running simultaneously

	// This gets overwritten each time this.ready is overwritten. Until
	// the first time that happens, it's a noop
	_abort: function () {},

	ready: function () {
		var node = this, outputdir;

		if ( !node._ready ) {
			outputdir = path.resolve( session.config.gobbledir, node.id, '' + node.counter++ );
			node._ready = sander.mkdir( outputdir ).then( function () {
				return new Promise( function ( fulfil, reject ) {
					var transformation = {
						node: node,
						cachedir: path.resolve( session.config.gobbledir, node.id, '.cache' )
					}, i;

					node._abort = function ( err ) {
						reject( err );
						node._ready = null;
						transformation.aborted = true;
					};

					node.input.ready().then( function ( inputdir ) {
						queue.add( function ( cb ) {
							var promise, called, callback, errback, start, subtask;

							subtask = session.start( '%s transformation running...', node.id );
							start = Date.now();

							callback = function ( err ) {
								var gobbleError, stack;

								if ( called ) {
									return;
								}

								subtask.done();

								if ( err ) {
									stack = err.stack || new Error().stack;

									console.log( 'err', err );

									gobbleError = new GobbleError({
										message: 'transformation failed',
										id: node.id,
										code: 'TRANSFORMATION_FAILED',
										original: err,
										stack: stack
									});

									session.error( gobbleError );

									// propagate errors synchronously
									i = node.callbacks.length;
									while ( i-- ) {
										node.callbacks[i]( gobbleError );
									}

									queue.abort();
									node._abort( err );
								}

								else {
									session.info( '%s transformation finished in %sms', node.id, Date.now() - start );
									fulfil( outputdir );
									cb();
								}
							};

							try {
								promise = node.transformer.call( transformation, inputdir, outputdir, assign({}, node.options ), callback );

								if ( promise && typeof promise.then === 'function' ) {
									promise.then( function () {
										callback(); // ensure no argument is passed
									}).catch( callback );
								}
							} catch ( err ) {
								errback( err );
							}
						});
					}).catch( session.error );
				});
			});
		}

		return node._ready;
	},

	_relay: function ( err, outputdir ) {
		var i = this.callbacks.length;
		while ( i-- ) {
			this.callbacks[i]( err, outputdir );
		}

		if ( !err ) {
			i = this.inspectTargets.length;
			while ( i-- ) {
				sander.copydir( outputdir ).to( this.inspectTargets[i] );
			}
		}
	},

	transform: function ( fn, userOptions ) {
		var options;

		if ( typeof fn === 'string' ) {
			fn = tryToLoad( fn );
		}

		// If function takes fewer than 3 arguments, it's a file transformer
		if ( fn.length < 3 ) {

			options = assign({}, fn.defaults, userOptions, {
				cache: {},
				fn: fn,
				userOptions: assign( {}, userOptions )
			});

			if ( typeof options.accept === 'string' ) {
				options.accept = [ options.accept ];
			}

			return new Node( this, builtins.map, options, fn.id || fn.name );
		}

		// Otherwise it's a directory transformer
		return new Node( this, fn, userOptions );
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

	map: function ( fn, userOptions ) {
		warnOnce( 'node.map() is deprecated. You should use node.transform() instead for both file and directory transforms' );
		return this.transform( fn, userOptions );
	},

	watch: function ( callback ) {
		var node = this;

		node.callbacks.push( callback );

		sander.mkdir( session.config.gobbledir, node.id ).then( function () {
			var relay;

			// If this node isn't already in watching mode, it needs to be...
			if ( !node._watcher ) {
				relay = function ( outputdir ) {
					node._relay( null, outputdir );
				};

				node._watcher = node.input.watch( function ( err, dir ) {
					if ( err ) {
						node._relay( err );
					}

					node._abort( err || { code: 'BUILD_INVALIDATED' });

					if ( dir ) {
						node.ready().then( relay );
					}
				});
			}
		}).catch( session.error );

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
			sander.rimraf( target );
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
	},

	_cleanup: function () {
		var node = this, dir = path.join( session.config.gobbledir, node.id );

		// Remove everything except the last successful outputdir and the cachedir
		// Use readdirSync to eliminate race conditions
		fs.readdirSync( dir ).map( function ( file ) {
			return file != node.counter && file !== '.cache';
		}).forEach( function ( dirpath ) {
			sander.rimraf( dirpath );
		});

		node.input._cleanup();
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

function warnOnce () {
	var warning = require( 'util' ).format.apply( null, arguments );

	if ( !alreadyWarned[ warning ] ) {
		console.log( warning );
		alreadyWarned[ warning ] = true;
	}
}
