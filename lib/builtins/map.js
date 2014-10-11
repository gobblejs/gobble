var path = require( 'path' ),
	crc32 = require( 'buffer-crc32' ),
	Promise = require( 'promo' ).Promise,
	Queue = require( '../queue/Queue' ),
	sander = require( 'sander' ),
	link = require( '../file/link' ),
	assign = require( '../utils/assign' ),
	compareBuffers = require( '../utils/compareBuffers' );

var queue = new Queue();

module.exports = function map ( srcDir, destDir, options, callback, errback ) {
	var transformation = this;

	queue.once( 'error', errback );

	sander.lsr( srcDir ).then( function ( files ) {
		var promises = files.map( function ( filename ) {
			var ext = path.extname( filename ),
				srcpath,
				destpath;

			srcpath = path.join( srcDir, filename );
			destpath = path.join( destDir, filename );

			// If this mapper only accepts certain extensions, and this isn't
			// one of them, just copy the file
			// TODO link it instead
			if ( options.accept && !~options.accept.indexOf( ext ) ) {
				return sander.copyFile( srcpath ).to( destpath );
			}

			return sander.stat( srcpath ).then( function ( stats ) {
				if ( stats.isDirectory() ) {
					return;
				}

				return sander.readFile( srcpath ).then( function ( data ) {
					var crc, previous;

					if ( transformation.aborted ) {
						return;
					}

					// If the file contents haven't changed, we have nothing to do except
					// copy the last successful transformation
					crc = crc32( data );
					previous = options.cache[ filename ];

					if ( previous && compareBuffers( crc, previous.crc ) ) {
						return sander.copyFile( previous.path ).to( destpath );
					}

					return new Promise( function ( fulfil, reject ) {
						var result, filepath, creator, message, cachepath, err;

						queue.add( function ( cb ) {
							var context = {
								src: srcpath,
								dest: path.join( destDir, filename ),
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

								filepath = srcDir + path.sep + filename;
								message = 'An error occurred while processing ' + filepath.magenta;

								if ( creator = transformation.node.input._findCreator( filename ) ) {
									message += ' (this file was created by the ' + creator.id.cyan + ' transformation)';
								}

								errback({
									message: message + ':\n' + err.message,
									filename: filename,
									stack: err.stack
								});

								queue.abort();
								return;
							}

							if ( options.ext ) {
								filename = filename.substr( 0, filename.length - ext.length ) + options.ext;
							}

							cachepath = path.resolve( transformation.cachedir, filename );

							sander.writeFile( cachepath, result ).then( function () {
								options.cache[ filename ] = {
									crc: crc,
									path: cachepath
								};

								// link to outputdir
								return link( cachepath ).to( destDir, filename );
							}).then( function () {
								fulfil();
								cb();
							}, reject );
						});
					});
				});
			});
		});

		return Promise.all( promises ).then( callback, errback );
	});
};
