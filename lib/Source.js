var path = require( 'path' ),
	chokidar = require( 'chokidar' ),
	minimatch = require( 'minimatch' ),
	helpers = require( './helpers' ),
	debug = require( './utils/debug' ),
	uid = require( './utils/uid' ),
	throttle = require( './utils/throttle' ),
	cwd = require( './cwd' ),
	Node = require( './Node' );

var Source = function ( pattern ) {
	var node = this;

	node.pattern = pattern;
	node._resolvedPattern = path.join( cwd(), pattern );
	node.callbacks = [];

	node.entryPoint = getEntryPoint( node._resolvedPattern );

	node.id = uid( 'yabl' );
	node._dir = path.join( cwd(), '.yabl', node.id );
};

Source.prototype = Object.create( Node.prototype );

Source.prototype.export = function ( dest ) {
	this.copyTo( dest );
	return this;
};

Source.prototype.copyTo = function ( dest ) {
	return helpers.glob( this._resolvedPattern ).then( function ( files ) {
		var promises = files.map( function ( file ) {
			return helpers.copy( file, path.join( dest, file.replace( cwd(), '' ) ) );
		});
	}).catch( debug );
};

Source.prototype.watch = function ( callback ) {
	var node = this, copyFile, removeFile, dispatchCallbacks;

	node.callbacks.push( callback );

	helpers.mkdirp( node._dir ).then( function () {
		// If this node isn't already in watching mode, it needs to be...
		if ( !node.watching ) {
			copyFile = function ( path ) {
				if ( minimatch( path, node._resolvedPattern ) ) {
					helpers.copy( path, node._dir + path.replace( cwd(), '' ) ).then( dispatchCallbacks );
				}
			};

			removeFile = function ( path ) {
				if ( minimatch( path, node._resolvedPattern ) ) {
					helpers.unlink( node._dir + path.replace( cwd(), '' ) ).then( dispatchCallbacks );
				}
			};

			dispatchCallbacks = throttle( function () {
				var i = node.callbacks.length;
				while ( i-- ) {
					node.callbacks[i]( node._dir );
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
};

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
