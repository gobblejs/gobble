var path = require( 'path' ),
	chokidar = require( 'chokidar' ),
	minimatch = require( 'minimatch' ),
	Promise = require( 'promo' ).Promise,
	file = require( './file' ),
	uid = require( './utils/uid' ),
	throttle = require( './utils/throttle' ),
	assign = require( './utils/assign' ),
	config = require( './config' ),
	Node = require( './Node' ),
	logger = require( './logger' );

var Source = function ( dir, options ) {
	var node = this;

	node.dir = path.join( config.cwd, dir );
	node.callbacks = [];

	file.exists( node.dir ).then( function ( exists ) {
		if ( !exists ) {
			logger.warn( 'The \'{dir}\' directory does not exist!', { dir: dir });
		}
	});

	node.static = options && options.static;
	node._ready = Promise.resolve( node.dir );
};

Source.prototype = assign( Object.create( Node.prototype ), {

	ready: function () {
		return this._ready;
	},

	watch: function ( callback ) {
		var node = this, relay;

		node.callbacks.push( callback );

		node.ready().then( function ( outputDir ) {
			callback( null, outputDir );
		});

		// If this node isn't already in watching mode, it needs to be...
		if ( !node.watching && !node.static ) {
			relay = function () {
				node._relay( null, node.dir );
			};

			node._watcher = chokidar.watch( node.dir, {
				persistent: true,
				ignoreInitial: true
			});

			node._watcher.on( 'add',    relay );
			node._watcher.on( 'change', relay );
			node._watcher.on( 'unlink', relay );

			node._watcher.on( 'error', function ( err ) {
				logger.error( 'error while watching \'{dir}\': {message}' , { dir: node.dir, message: err.message || err });
			});

			this.watching = true;
		}
	}
});

Source.prototype.constructor = Source;
module.exports = Source;
