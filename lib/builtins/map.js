var path = require( 'path' ),
	crc32 = require( 'buffer-crc32' ),
	Promise = require( 'promo' ).Promise,
	Queue = require( '../queue/Queue' ),
	sander = require( 'sander' ),
	link = require( '../file/link' ),
	assign = require( '../utils/assign' ),
	compareBuffers = require( '../utils/compareBuffers' ),
	GobbleError = require( '../utils/GobbleError' );



module.exports = function map ( inputdir, outputdir, options ) {
	var transformation = this;

	return new Promise( function ( fulfil, reject ) {
		var queue = new Queue();

		queue.once( 'error', reject );

		sander.lsr( inputdir ).then( function ( files ) {
			var promises = files.map( function ( filename ) {
				var ext = path.extname( filename ),
					srcpath,
					destpath;

				srcpath = path.join( inputdir, filename );
				destpath = path.join( outputdir, filename );

				// If this mapper only accepts certain extensions, and this isn't
				// one of them, just copy the file
				if ( options.accept && !~options.accept.indexOf( ext ) ) {
					return sander.link( srcpath ).to( destpath );
				}

				return sander.stat( srcpath ).then( function ( stats ) {
					if ( stats.isDirectory() ) {
						return;
					}

					return sander.readFile( srcpath ).then( function ( data ) {
						var crc, previous, promises;

						if ( transformation.aborted ) {
							return;
						}

						// If the file contents haven't changed, we have nothing to do except
						// copy the last successful transformation
						crc = crc32( data );
						previous = options.cache[ filename ];

						if ( previous && compareBuffers( crc, previous.crc ) ) {
							promises = [ sander.link( previous.codepath ).to( destpath ) ];

							if ( previous.mappath ) {
								promises.push( sander.link( previous.mappath ).to( destpath + '.map' ) );
							}

							return Promise.all( promises );
						}

						return new Promise( function ( fulfil, reject ) {
							queue.add( function ( cb ) {
								var destname, result, filepath, creator, message, err, context, cacheobj, code, sourcemap;

								destname = options.ext ? filename.substr( 0, filename.length - ext.length ) + options.ext : filename;

								// Create context object - this will be passed to transformers
								context = {
									src: srcpath,
									dest: path.join( outputdir, destname ),
									filename: filename
								};


								try {
									result = options.fn.call( context, data.toString(), assign( {}, options.userOptions ) );
								} catch ( e ) {
									if ( typeof e === 'string' ) {
										err = new Error( e );
									} else {
										err = e;
									}

									filepath = inputdir + path.sep + filename;
									message = 'An error occurred while processing ' + filepath.magenta;

									if ( creator = transformation.node.input._findCreator( filename ) ) {
										message += ' (this file was created by the ' + creator.id.cyan + ' transformation)';
									}

									queue.abort();

									throw new GobbleError({
										message: message + ':\n' + err.message,
										code: 'MAP_TRANSFORM_FAILED',
										filename: filename,
										stack: err.stack
									});
								}

								cacheobj = {
									crc: crc,
									codepath: path.resolve( transformation.cachedir, destname )
								};

								if ( typeof result === 'object' && result.code ) {
									code = result.code;
									sourcemap = processMap( result.map );
								} else {
									code = result;
								}

								promises = [ writeCode() ];

								if ( sourcemap ) {
									cacheobj.mappath = cacheobj.codepath + '.map';
									promises.push( writeMap() );
								}

								Promise.all( promises ).then( function () {
									fulfil();
									cb();
								}, reject );

								function processMap ( map ) {
									if ( typeof map === 'string' ) {
										map = JSON.parse( map );
									}

									map.sources = [ filename ];
									map.sourcesContent = [ data.toString() ];
									return JSON.stringify( map );
								}

								function writeCode () {
									if ( sourcemap ) {
										code += '\n//# sourceMappingURL=' + destname + '.map';
									}

									return sander.writeFile( cacheobj.codepath, code ).then( function () {
										return link( cacheobj.codepath ).to( context.dest );
									});
								}

								function writeMap () {
									return sander.writeFile( cacheobj.mappath, sourcemap ).then( function () {
										return link( cacheobj.mappath ).to( context.dest + '.map' );
									});
								}
							});
						});
					});
				});
			});

			return Promise.all( promises );
		}).then( function () {
			queue.off( 'error', reject );
			fulfil();
		}, reject );
	});
};
