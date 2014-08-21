var path = require( 'path' ),
	chokidar = require( 'chokidar' ),
	minimatch = require( 'minimatch' ),
	Promise = require( 'promo' ).Promise,
	file = require( './file' ),
	assign = require( './utils/assign' ),
	config = require( './config' ),
	Node = require( './Node' ),
	logger = require( './logger' );

var Source = function ( dir, options ) {
	var node = this;

	node.dir = path.resolve( config.cwd, dir );
	node.callbacks = [];
	node.inspectTargets = [];
	node.includePatterns = [];
	node.excludePatterns = [];

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

	watch: function ( callback, options ) {
		var node = this, options, relay;

		node.callbacks.push( callback );

		// If this node isn't already in watching mode, it needs to be...
		if ( !node._watcher && !node.static ) {
			relay = function () {
				node._relay({ gobble: 'INVALIDATE', message: 'a file changed TK' }, node.dir );
			};

			options = {
				persistent: true,
				ignoreInitial: true,
				useFsEvents: true
			};

			if ( node.includePatterns.length || node.excludePatterns.length ) {
				options.ignored = function ( filename ) {
					var matches, shouldInclude = true, shouldExclude = false; // innocent until proven guilty

					if ( !filename ) {

					}

					filename = path.relative( node.dir, filename );
					matches = function ( pattern ) {
						return pattern.test( filename );
					};

					if ( node.includePatterns.length ) {
						shouldInclude = node.includePatterns.some( matches );
					}

					if ( node.excludePatterns.length ) {
						shouldExclude = node.excludePatterns.some( matches );
					}

					return !shouldInclude || shouldExclude;
				};
			}

			node._watcher = chokidar.watch( node.dir, options );

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
		};
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
	},

	include: function ( patterns ) {
		if ( typeof patterns === 'string' ) {
			this.includePatterns.push( makeRegex( patterns ) );
		} else {
			this.includePatterns.push.apply( this.includePatterns, patterns.map( makeRegex ) );
		}

		return this;
	},

	exclude: function ( patterns ) {
		if ( typeof patterns === 'string' ) {
			this.excludePatterns.push( makeRegex( patterns ) );
		} else {
			this.excludePatterns.push.apply( this.excludePatterns, patterns.map( makeRegex ) );
		}

		return this;
	}
});

Source.prototype.constructor = Source;
module.exports = Source;

function makeRegex ( globPattern ) {
	return minimatch.makeRe( globPattern );
}
