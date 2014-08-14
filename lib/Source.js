var path = require( 'path' ),
	chokidar = require( 'chokidar' ),
	minimatch = require( 'minimatch' ),
	yablfs = require( './utils/yablfs' ),
	debug = require( './utils/debug' ),
	uid = require( './utils/uid' ),
	throttle = require( './utils/throttle' ),
	yabl = require( './index' ),
	Node = require( './Node' );

var Source = function ( pattern ) {
	var node = this;

	node.pattern = pattern;
	node._resolvedPattern = path.join( yabl.CWD, pattern );
	node.callbacks = [];

	node.entryPoint = getEntryPoint( node._resolvedPattern );

	node.id = uid( 'yabl' );
	node._dir = path.join( yabl.CWD, '.yabl', node.id );
};

Source.prototype = Object.create( Node.prototype );

Source.prototype.export = function ( dest ) {
	this.copyTo( dest );
	return this;
};

Source.prototype.copyTo = function ( dest ) {
	return yablfs.glob( this.pattern ).then( function ( files ) {
		var promises;

		promises = files.map( function ( file ) {
			return yablfs.copy( file, path.join( dest, file.replace( process.cwd(), '' ) ) );
		});
	}).catch( debug );
};

Source.prototype.watch = function ( callback ) {
	var node = this, copyFile, removeFile, dispatchCallbacks;

	yabl.fs.mkdirp( node._dir ).then( function () {
		// If this node isn't already in watching mode, it needs to be...
		if ( !node.watching ) {
			copyFile = function ( path ) {
				if ( minimatch( path, node._resolvedPattern ) ) {
					yabl.fs.copy( path, node._dir + path.replace( yabl.CWD, '' ) ).then( dispatchCallbacks );
				}
			};

			removeFile = function ( path ) {
				if ( minimatch( path, node._resolvedPattern ) ) {
					yabl.fs.unlink( node._dir + path.replace( yabl.CWD, '' ) ).then( dispatchCallbacks );
				}
			};

			dispatchCallbacks = throttle( function () {
				var i = node.callbacks.length;
				while ( i-- ) {
					console.log( 'dispatching callback', i );
					node.callbacks[i]( node._dir );
				}
			}, 100 );

			// TODO watch as low down the tree as possible
			node._watcher = chokidar.watch( node.entryPoint, {
				persistent: true
			});

			node._watcher.on( 'add',    copyFile );
			node._watcher.on( 'change', copyFile );
			node._watcher.on( 'unlink', removeFile );

			this.watching = true;
		}

		node.callbacks.push( callback );
	});
};

module.exports = Source;


function getEntryPoint ( pattern ) {
	var parts = pattern.split( '*' );
	return parts[0];
}
