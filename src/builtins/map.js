import { extname, join, resolve } from 'path';
import * as chalk from 'chalk';
import Queue from '../queue/Queue';
import { link, lsr, readFile, writeFile, Promise } from 'sander';
import linkFile from '../file/link';
import assign from '../utils/assign';
import config from '../config';
import extractLocationInfo from '../utils/extractLocationInfo';
import { isRegExp } from '../utils/is';
import { ABORTED } from '../utils/signals';

let SOURCEMAPPING_URL = 'sourceMa';
SOURCEMAPPING_URL += 'ppingURL';

const SOURCEMAP_COMMENT = new RegExp( `\\/\\/#\\s*${SOURCEMAPPING_URL}=([^\\r\\n]+)` );

export default function map ( inputdir, outputdir, options ) {
	let changed = {};
	this.changes.forEach( change => {
		if ( !change.removed ) {
			changed[ change.file ] = true;
		}
	});

	return new Promise( ( fulfil, reject ) => {
		const queue = new Queue();

		queue.once( 'error', reject );

		lsr( inputdir ).then( files => {
			const promises = files.map( filename => {
				if ( this.aborted ) return;

				const ext = extname( filename );

				// change extension if necessary, e.g. foo.coffee -> foo.js
				const destname = ( options.ext && ~options.accept.indexOf( ext ) ) ? filename.substr( 0, filename.length - ext.length ) + options.ext : filename;

				const src = join( inputdir, filename );
				const dest = join( outputdir, destname );

				// If this mapper only accepts certain extensions, and this isn't
				// one of them, just copy the file
				if ( shouldSkip( options, ext, filename ) ) {
					return link( src ).to( dest );
				}

				// If this file *does* fall within this transformer's remit, but
				// hasn't changed, we just copy the cached file
				if ( !changed[ filename ] && options.cache.hasOwnProperty( filename ) ) {
					return useCachedTransformation( this.node, options.cache[ filename ], dest );
				}

				// Otherwise, we queue up a transformation
				return queue.add( ( fulfil, reject ) => {
					if ( this.aborted ) {
						return reject( ABORTED );
					}

					// Create context object - this will be passed to transformers
					const context = {
						log: this.log,
						env: config.env,
						src, dest, filename
					};

					const transformOptions = assign( {}, options.fn.defaults, options.userOptions );

					delete transformOptions.accept;
					delete transformOptions.ext;

					return readFile( src )
						.then( buffer => buffer.toString( transformOptions.sourceEncoding ) )
						.then( data => {
							if ( this.aborted ) return reject( ABORTED );

							let result;

							try {
								result = options.fn.call( context, data, transformOptions );
							} catch ( e ) {
								let err = createTransformError( e, src, filename, this.node );
								return reject( err );
							}

							const { code, map } = processResult( result, data, src, dest );

							if ( map ) {
								this.node.sourcemaps[ dest ] = map;
							}

							const codepath = resolve( this.cachedir, filename );

							writeTransformedResult( code, codepath, dest )
								.then( () => options.cache[ filename ] = { codepath, map } )
								.then( fulfil )
								.catch( reject );
						});
				}).catch( err => {
					queue.abort();
					throw err;
				});
			});

			return Promise.all( promises );
		}).then( () => {
			queue.off( 'error', reject );
			fulfil();
		}, reject );
	});
}

function processResult ( result, original, src, dest ) {
	if ( typeof result === 'object' && 'code' in result ) {
		// if a sourcemap was returned, use it
		if ( result.map ) {
			return {
				code: result.code,
				map: processSourcemap( result.map, src, dest, original )
			};
		}

		// otherwise we might have an inline sourcemap
		else {
			return processInlineSourceMap( result.code, src, dest, original );
		}
	}

	if ( typeof result === 'string' ) {
		return processInlineSourceMap( result, src, dest, original );
	}

	return { code: result, map: null };
}

function processInlineSourceMap ( code, src, dest, original ) {
	// if there's an inline sourcemap, process it
	let match = SOURCEMAP_COMMENT.exec( code );
	let map = null;

	if ( match && /^data/.test( match[1] ) ) {
		match = /base64,(.+)$/.exec( match[1] );

		if ( !match ) {
			throw new Error( 'sourceMappingURL is not base64-encoded' );
		}

		let json = atob( match[1] );

		map = processSourcemap( json, src, dest, original );
		code = code.replace( SOURCEMAP_COMMENT, '' );
	}

	return { code, map };
}

function useCachedTransformation ( node, cached, dest ) {
	if ( cached.map ) {
		node.sourcemaps[ dest ] = cached.map;
	}

	return link( cached.codepath ).to( dest );
}

function writeTransformedResult ( code, codepath, dest ) {
	return writeFile( codepath, code ).then( () =>
		// TODO use sander.link?
		linkFile( codepath ).to( dest )
	);
}

function createTransformError ( original, src, filename, node ) {
	const err = typeof original === 'string' ? new Error( original ) : original;

	let message = 'An error occurred while processing ' + chalk.magenta( src );
	let creator;

	if ( creator = node.input._findCreator( filename ) ) {
		message += ` (this file was created by the ${creator.id} transformation)`;
	}

	const { line, column } = extractLocationInfo( err );

	err.file = src;
	err.line = line;
	err.column = column;

	return err;
}

function processSourcemap ( map, src, dest, data ) {
	if ( typeof map === 'string' ) {
		map = JSON.parse( map );
	}

	if ( !map ) {
		return null;
	}

	map.file = dest;
	map.sources = [ src ];
	map.sourcesContent = [ data ];
	return map;
}

function shouldSkip ( options, ext, filename ) {
	let filter;

	if ( filter = options.accept ) {
		let i;

		for ( i=0; i<filter.length; i++ ) {
			const flt = filter[i];

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

function atob ( base64 ) {
	return new Buffer( base64, 'base64' ).toString( 'utf8' );
}

function btoa ( str ) {
	return new Buffer( str ).toString( 'base64' );
}
