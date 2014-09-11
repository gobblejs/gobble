var path = require( 'path' ),
	crc32 = require( 'buffer-crc32' ),
	Promise = require( 'promo' ).Promise,
	Queue = require( '../queue/Queue' ),
	file = require( '../file' ),
	compareBuffers = require( '../utils/compareBuffers' );

var queue = new Queue();

module.exports = function map ( srcDir, destDir, options, callback, errback ) {
	var transformation = this;

	queue.once( 'error', errback );

	file.ls( srcDir ).then( function ( files ) {
		var promises = files.map( function ( filename ) {
			var ext = path.extname( filename );

			// If this mapper only accepts certain extensions, and this isn't
			// one of them, just copy the file
			if ( options.accept && !~options.accept.indexOf( ext ) ) {
				return file.copy( srcDir, filename ).to( destDir, filename );
			}

			return file.stat( srcDir, filename ).then( function ( stats ) {
				if ( stats.isDirectory() ) {
					return;
				}

				return file.read( srcDir, filename ).then( function ( data ) {
					var crc, previous;

					if ( transformation.aborted ) {
						return;
					}

					// If the file contents haven't changed, we have nothing to do except
					// copy the last successful transformation
					crc = crc32( data );
					previous = options.cache[ filename ];

					if ( previous && compareBuffers( crc, previous.crc ) ) {
						return file.copy( previous.path ).to( destDir, filename );
					}

					return new Promise( function ( fulfil, reject ) {
						var result, filepath, creator, message, cachepath;



						queue.add( function ( cb ) {
							try {
								result = options.fn( data.toString(), options.options );
							} catch ( err ) {
								if ( typeof err === 'string' ) {
									err = new Error( err );
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

							file.write( cachepath, result ).then( function () {
								options.cache[ filename ] = {
									crc: crc,
									path: cachepath
								};

								// link to outputdir
								return file.link( cachepath ).to( destDir, filename );
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
