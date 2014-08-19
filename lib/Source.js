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

	node.dir = path.resolve( config.cwd, dir );
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
		if ( !node._watcher && !node.static ) {
			relay = function () {
				node._relay({ gobble: 'INVALIDATE', message: 'a file changed TK' }, node.dir );
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
				this._watcher.close();
				this._watcher = null;
			}
		}
	}
});

Source.prototype.constructor = Source;
module.exports = Source;
