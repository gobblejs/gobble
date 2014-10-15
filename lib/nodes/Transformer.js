var path = require( 'path' ),
	sander = require( 'sander' ),
	Node = require( './Node' ),

	Promise = sander.Promise,

	session = require( '../session' ),
	queue = require( '../queue' ),

	GobbleError = require( '../utils/GobbleError' ),
	assign = require( '../utils/assign' ),
	uid = require( '../utils/uid' ),
	warnOnce = require( '../utils/warnOnce' );


module.exports = Node.extend({
	init: function ( input, transformer, options, id ) {
		var node = this;

		node.input = input;

		// Propagate errors and information
		input.on( 'error', function ( err ) {
			node._abort();
			node.emit( 'error', err );
		});

		input.on( 'info', function ( details ) {
			node.emit( 'info', details );
		});

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
	},

	ready: function () {
		var node = this, outputdir;

		if ( !node._ready ) {
			outputdir = path.resolve( session.config.gobbledir, node.id, '' + node.counter++ );
			node._ready = sander.mkdir( outputdir ).then( function () {
				return new Promise( function ( fulfil, reject ) {
					var transformation = {
						node: node,
						cachedir: path.resolve( session.config.gobbledir, node.id, '.cache' )
					};

					node._abort = function ( err ) {
						reject( err );
						node._ready = null;
						transformation.aborted = true;
					};

					return node.input.ready().then( function ( inputdir ) {
						queue.add( function ( cb ) {
							var promise, called, callback, start;

							node.emit( 'info', {
								code: 'TRANSFORM_START',
								id: node.id
							});

							start = Date.now();

							callback = function ( err ) {
								var gobbleError, stack;

								if ( called ) {
									return;
								}

								if ( err ) {
									stack = err.stack || new Error().stack;

									console.log( 'err', err );

									gobbleError = new GobbleError({
										message: 'transformation failed',
										id: node.id,
										code: 'TRANSFORMATION_FAILED',
										original: err,
										stack: stack,
										filename: err.filename,
										line: err.line,
										column: err.column
									});

									node.emit( 'error', gobbleError );

									queue.abort();
									node._abort( gobbleError );
								}

								else {
									//session.info( '%s transformation finished in %sms', node.id, Date.now() - start );
									node.emit( 'info', {
										code: 'TRANSFORM_END',
										id: node.id,
										duration: Date.now() - start
									});

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
								callback( err );
							}
						});
					}).catch( node._abort );
				});
			});
		}

		return node._ready;
	},

	start: function () {
		var node = this;

		sander.mkdir( session.config.gobbledir, node.id ).then( function () {
			node.input.start();
		}).catch( function ( err ) {
			node.emit( 'error', err );
		});
	},

	stop: function () {
		// TODO
	},

	// watch: function ( callback ) {
	// 	var node = this;

	// 	node.callbacks.push( callback );

	// 	sander.mkdir( session.config.gobbledir, node.id ).then( function () {
	// 		var relay;

	// 		// If this node isn't already in watching mode, it needs to be...
	// 		if ( !node._watcher ) {
	// 			relay = function ( outputdir ) {
	// 				node._relay( null, outputdir );
	// 			};

	// 			node._watcher = node.input.watch( function ( err, dir ) {
	// 				if ( err ) {
	// 					node._relay( err );
	// 				}

	// 				node._abort( err || { code: 'BUILD_INVALIDATED' });

	// 				if ( dir ) {
	// 					node.ready().then( relay );
	// 				}
	// 			});
	// 		}
	// 	}).catch( session.error );

	// 	return {
	// 		cancel: function () {
	// 			node.unwatch( callback );
	// 		}
	// 	};
	// },

	// unwatch: function ( callback ) {
	// 	var callbacks = this.callbacks, index = callbacks.indexOf( callback );

	// 	if ( ~callbacks.indexOf( callback ) ) {
	// 		callbacks.splice( index, 1 );

	// 		if ( !callbacks.length && this._watcher ) {
	// 			this._watcher.cancel();
	// 			this._watcher = null;
	// 		}
	// 	}
	// }
});