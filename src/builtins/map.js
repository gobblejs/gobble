import { basename, extname, join, resolve, sep } from 'path';
import * as crc32 from 'buffer-crc32';
import Queue from '../queue/Queue';
import { link, lsr, readFile, stat, writeFile, Promise } from 'sander';
import linkFile from '../file/link';
import assign from '../utils/assign';
import config from '../config';
import compareBuffers from '../utils/compareBuffers';
import extractLocationInfo from '../utils/extractLocationInfo';
import { isRegExp } from '../utils/is';

export default function map ( inputdir, outputdir, options ) {
	var transformation = this;

	return new Promise( function ( fulfil, reject ) {
		var queue = new Queue();

		queue.once( 'error', reject );

		lsr( inputdir ).then( function ( files ) {
			var promises = files.map( function ( filename ) {
				var ext = extname( filename ),
					srcpath,
					destpath,
					destname,
					mapdest;

				destname = ( options.ext && ~options.accept.indexOf( ext ) ) ? filename.substr( 0, filename.length - ext.length ) + options.ext : filename;

				srcpath = join( inputdir, filename );
				destpath = join( outputdir, destname );

				mapdest = destpath + '.map';

				// If this mapper only accepts certain extensions, and this isn't
				// one of them, just copy the file
				if ( skip( options, ext, filename ) ) {
					return link( srcpath ).to( destpath );
				}

				return stat( srcpath ).then( function ( stats ) {
					if ( stats.isDirectory() ) {
						return;
					}

					return readFile( srcpath ).then( function ( data ) {
						var crc, previous, promises;

						if ( transformation.aborted ) {
							return;
						}

						// If the file contents haven't changed, we have nothing to do except
						// copy the last successful transformation
						crc = crc32( data );
						previous = options.cache[ filename ];

						if ( previous && compareBuffers( crc, previous.crc ) ) {
							// if there's no sourcemap involved, we can just copy
							// the previously generated code
							if ( !previous.mapdest ) {
								return link( previous.codepath ).to( destpath );
							}

							// otherwise, we need to write a new file with the correct
							// sourceMappingURL. (TODO is this really the best way?
							// What if sourcemaps had their own parallel situation? What
							// if the sourcemap itself has changed? Need to investigate
							// when I'm less pressed for time)
							return readFile( previous.codepath ).then( String ).then( function ( code ) {
								// remove any existing sourcemap comment
								code = code.replace( /\/\/#\s*sourceMappingURL=[^\s]+/, '' ) +
									'\n//# sourceMappingURL=' + mapdest;

								return Promise.all([
									writeFile( destpath, code ),
									link( previous.mapdest ).to( mapdest )
								]);
							});
						}

						return queue.add( function ( fulfil, reject ) {
							var result, filepath, creator, message, err, context, cacheobj, code, sourcemap, loc;

							// Create context object - this will be passed to transformers
							context = {
								src: srcpath,
								dest: join( outputdir, destname ),
								filename: filename,
								mapdest: mapdest,
								log: transformation.log,
								env: config.env
							};

							try {
								result = options.fn.call( context, data.toString(), assign( {}, options.fn.defaults, options.userOptions ) );
							} catch ( e ) {
								if ( typeof e === 'string' ) {
									err = new Error( e );
								} else {
									err = e;
								}

								filepath = inputdir + sep + filename;
								message = 'An error occurred while processing ' + filepath.magenta;

								if ( creator = transformation.node.input._findCreator( filename ) ) {
									message += ' (this file was created by the ' + creator.id + ' transformation)';
								}

								loc = extractLocationInfo( err );

								err.file = srcpath;
								err.line = loc.line;
								err.column = loc.column;

								return reject( err );
							}

							cacheobj = {
								crc: crc,
								codepath: resolve( transformation.cachedir, destname )
							};

							if ( typeof result === 'object' && result.code ) {
								code = result.code;
								sourcemap = processMap( result.map );
							} else {
								code = result;
							}

							promises = [ writeCode() ];

							if ( sourcemap ) {
								cacheobj.mapdest = resolve( transformation.cachedir, basename( mapdest ) );
								promises.push( writeMap() );
							}

							Promise.all( promises ).then( function () {
								options.cache[ filename ] = cacheobj;
							}).then( fulfil, reject );

							function processMap ( map ) {
								if ( typeof map === 'string' ) {
									map = JSON.parse( map );
								}

								if ( !map ) {
									return null;
								}

								map.sources = [ srcpath ];
								map.sourcesContent = [ data.toString() ];
								return JSON.stringify( map );
							}

							function writeCode () {
								if ( sourcemap ) {
									// remove any existing sourcemap comment
									code = code.replace( /\/\/#\s*sourceMappingURL=[^\s]+/, '' );
									code += '\n//# sourceMappingURL=' + mapdest;
								}

								return writeFile( cacheobj.codepath, code ).then( function () {
									// TODO use sander.link?
									return linkFile( cacheobj.codepath ).to( context.dest );
								});
							}

							function writeMap () {
								return writeFile( cacheobj.mapdest, sourcemap ).then( function () {
									return linkFile( cacheobj.mapdest ).to( mapdest );
								});
							}
						}).catch( function ( err ) {
							queue.abort();
							throw err;
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
}

function skip(options, ext, filename) {
	var filter, i, flt;

	if ( filter = options.accept ) {
		for ( i=0; i<filter.length; i++ ) {
			flt = filter[i];

			if ( typeof flt === 'string' && flt === ext ) {
				return false;
			} else if ( isRegExp( flt ) && flt.test( filename ) ) {
				return false;
			}
		}

		return true;
	}

	return false;
}
