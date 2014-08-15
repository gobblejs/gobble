var path = require( 'path' ),
	chokidar = require( 'chokidar' ),
	minimatch = require( 'minimatch' ),
	Promise = require( 'promo' ).Promise,
	helpers = require( './helpers' ),
	debug = require( './utils/debug' ),
	uid = require( './utils/uid' ),
	throttle = require( './utils/throttle' ),
	assign = require( './utils/assign' ),
	cwd = require( './cwd' ),
	Node = require( './Node' );

var Source = function ( pattern ) {
	var node = this;

	node.pattern = pattern;
	node._resolvedPattern = path.join( cwd(), pattern );
	node.callbacks = [];

	node.entryPoint = getEntryPoint( node._resolvedPattern );

	node.id = uid( 'source' );
	node.outputDir = path.join( cwd(), '.yabl', node.id );
};

Source.prototype = assign( Object.create( Node.prototype ), {

	_abort: function () {},

	ready: function () {
		var node = this;

		if ( !node._ready ) {
			node._ready = new Promise( function ( fulfil, reject ) {
				node._abort = function ( err ) {
					node._ready = null;
					reject( err );
				};

				helpers.glob( node._resolvedPattern ).then( function ( files ) {
					var promises = files.map( function ( file ) {
						return helpers.copy( file, path.join( node.outputDir, file.replace( cwd(), '' ) ) );
					});

					return Promise.all( promises ).then( function () {
						fulfil( node.outputDir );
					});
				}).catch( debug );
			});
		}

		return node._ready;
	},

	export: function ( dest ) {
		this.copyTo( dest );
		return this;
	},

	copyTo: function ( dest ) {
		return helpers.glob( this._resolvedPattern ).then( function ( files ) {
			var promises = files.map( function ( file ) {
				return helpers.copy( file, path.join( dest, file.replace( cwd(), '' ) ) );
			});
		}).catch( debug );
	},

	ls: function () {
		return helpers.glob( this._resolvedPattern ).then( function ( files ) {
			return files.map( function ( file ) {
				return file.replace( cwd(), '' );
			});
		});
	},

	watch: function ( callback ) {
		var node = this, copyFile, removeFile, dispatchCallbacks;

		node.callbacks.push( callback );

		helpers.mkdirp( node.outputDir ).then( function () {
			// If this node isn't already in watching mode, it needs to be...
			if ( !node.watching ) {
				copyFile = function ( path ) {
					if ( minimatch( path, node._resolvedPattern ) ) {
						helpers.copy( path, node.outputDir + path.replace( cwd(), '' ) ).then( dispatchCallbacks );
					}
				};

				removeFile = function ( path ) {
					if ( minimatch( path, node._resolvedPattern ) ) {
						helpers.unlink( node.outputDir + path.replace( cwd(), '' ) ).then( dispatchCallbacks );
					}
				};

				dispatchCallbacks = throttle( function () {
					var i = node.callbacks.length;
					while ( i-- ) {
						node.callbacks[i]( null, node.outputDir );
					}
				}, 100 );

				node._watcher = chokidar.watch( node.entryPoint, {
					persistent: true
				});

				node._watcher.on( 'add',    copyFile );
				node._watcher.on( 'change', copyFile );
				node._watcher.on( 'unlink', removeFile );

				node._watcher.on( 'error', function ( err ) {
					console.log( 'oh noes! an error happened:', err.message || err );
				})

				this.watching = true;
			}
		});
	}
});

Source.prototype.constructor = Source;
module.exports = Source;


function getEntryPoint ( pattern ) {
	var parts, base;

	parts = pattern.split( '*' );
	base = parts[0];

	if ( base.slice( -1 ) === '/' ) {
		base = base.substr( 0, base.length - 1 );
	}

	return base;
}
