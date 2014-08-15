var path = require( 'path' ),
	chokidar = require( 'chokidar' ),
	minimatch = require( 'minimatch' ),
	Promise = require( 'promo' ).Promise,
	file = require( './file' ),
	debug = require( './utils/debug' ),
	uid = require( './utils/uid' ),
	throttle = require( './utils/throttle' ),
	assign = require( './utils/assign' ),
	cwd = require( './cwd' ),
	Node = require( './Node' );

var Source = function ( dir ) {
	var node = this;

	node.dir = path.join( cwd(), dir );
	node.callbacks = [];

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
		if ( !node.watching ) {
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
				console.log( 'oh noes! an error happened:', err.message || err );
			});

			this.watching = true;
		}
	}
});

Source.prototype.constructor = Source;
module.exports = Source;
