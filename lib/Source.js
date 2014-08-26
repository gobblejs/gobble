var fs = require( 'fs' ),
	path = require( 'path' ),
	chokidar = require( 'chokidar' ),
	minimatch = require( 'minimatch' ),
	debounce = require( 'debounce' ),
	throttle = require( './utils/throttle' ),
	Promise = require( 'promo' ).Promise,
	file = require( './file' ),
	assign = require( './utils/assign' ),
	config = require( './config' ),
	uid = require( './utils/uid' ),
	Node = require( './Node' ),
	logger = require( './logger' );

var Source = function ( dir, options ) {
	var node = this;

	node.dir = path.resolve( config.cwd, dir );
	node.callbacks = [];
	node.inspectTargets = [];

	// in case we have filters
	node.includePatterns = [];
	node.excludePatterns = [];

	node.id = uid( ( options && options.id ) || 'source' );
	node.outputDir = path.resolve( config.gobbledir, node.id );
	node.counter = 1;

	file.exists( node.dir ).then( function ( exists ) {
		if ( !exists ) {
			logger.warn( 'The \'{dir}\' directory does not exist!', { dir: dir });
		}
	});

	node.static = options && options.static;
};

Source.prototype = assign( Object.create( Node.prototype ), {

	ready: function () {
		var node = this, outputDir;

		if ( !node._ready ) {
			if ( !this.includePatterns.length && !this.excludePatterns.length ) {
				node._ready = Promise.resolve( node.dir );
			}

			else {
				outputDir = path.resolve( node.outputDir, '' + node.counter++ );
				node._ready = file.mkdirp( outputDir ).then( function () {
					return new Promise( function ( fulfil, reject ) {
						node._abort = function () {
							reject();
							node._ready = null;
						};

						file.ls( node.dir ).then( function ( files ) {
							var promises = files.filter( function ( filename ) {
								return node._filter( filename );
							}).map( function ( filename ) {
								return file.merge( node.dir, filename ).to( outputDir, filename );
							});

							return Promise.all( promises );
						}).then( function () {
							fulfil( outputDir );
						});
					});
				}).catch( logger.error );
			}
		}

		return node._ready;
	},

	watch: function ( callback, options ) {
		var node = this, options, relay, changes = [];

		node.callbacks.push( callback );

		// If this node isn't already in watching mode, it needs to be...
		if ( !node._watcher && !node.static ) {
			relay = debounce(function () {
				logger.info( summariseChanges( changes ) );
				node._relay({ gobble: 'INVALIDATE', changes: changes }, node.dir );
				changes = [];
			}, 100 );

			options = {
				persistent: true,
				ignoreInitial: true,
				useFsEvents: false // see https://github.com/paulmillr/chokidar/issues/146
			};

			if ( node.includePatterns.length || node.excludePatterns.length ) {
				options.ignored = function ( filename ) {
					return !node._filter( path.relative( node.dir, filename ) );
				};
			}

			node._watcher = chokidar.watch( node.dir, options );

			[ 'add', 'change', 'unlink' ].forEach( function ( type ) {
				node._watcher.on( type, function ( path ) {
					changes.push({ type: type, path: path });
					relay();
				});
			});

			node._watcher.on( 'error', function ( err ) {
				if ( err.code === 'EMFILE' ) {
					logger.error( 'too many files open (EMFILE). Consider raising the limit with e.g. ' + 'ulimit -n 1024'.cyan + '. See ' + 'http://bit.ly/EMFILE'.magenta + ' for more information' );
				}

				else {
					logger.error( 'error while watching \'{dir}\': {message}' , { dir: node.dir, message: err.message || err });
				}
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
		var node = this;

		if ( typeof patterns === 'string' ) {
			node.includePatterns.push( makeRegex( patterns ) );
		} else {
			node.includePatterns.push.apply( node.includePatterns, patterns.map( makeRegex ) );
		}

		if ( !node._filter ) {
			node._filter = makeFilter( node );
		}

		node._abort();
		return node;
	},

	exclude: function ( patterns ) {
		var node = this;

		if ( typeof patterns === 'string' ) {
			node.excludePatterns.push( makeRegex( patterns ) );
		} else {
			node.excludePatterns.push.apply( node.excludePatterns, patterns.map( makeRegex ) );
		}

		if ( !node._filter ) {
			node._filter = makeFilter( node );
		}

		node._abort();
		return node;
	},

	_findCreator: function ( filename ) {
		try {
			fs.statSync( filename );
			return this;
		} catch ( err ) {
			return null;
		}
	}
});

Source.prototype.constructor = Source;
module.exports = Source;

function makeRegex ( globPattern ) {
	return minimatch.makeRe( globPattern );
}

function summariseChanges ( changes ) {
	var summary = {
		add: 0,
		unlink: 0,
		change: 0
	}, report = [];

	changes.forEach( function ( change ) {
		summary[ change.type ] += 1;
	});

	if ( summary.add ) {
		report.push( summary.add + ( summary.add === 1 ? ' file' : ' files' ) + ' added' );
	}

	if ( summary.change ) {
		report.push( summary.change + ( summary.change === 1 ? ' file' : ' files' ) + ' changed' );
	}

	if ( summary.unlink ) {
		report.push( summary.unlink + ( summary.unlink === 1 ? ' file' : ' files' ) + ' removed' );
	}

	return report.join( ', ' );
}

function makeFilter ( node ) {
	return function ( filename ) {
		var matches, shouldInclude = true, shouldExclude = false; // innocent until proven guilty

		if ( !filename ) {
			return true;
		}

		matches = function ( pattern ) {
			return pattern.test( filename );
		};

		if ( node.includePatterns.length ) {
			shouldInclude = node.includePatterns.some( matches );
		}

		if ( node.excludePatterns.length ) {
			shouldExclude = node.excludePatterns.some( matches );
		}

		return shouldInclude && !shouldExclude;
	};
}
