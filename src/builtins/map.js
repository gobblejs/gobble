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

const SOURCEMAP_COMMENT = /\/\/#\s*sourceMappingURL=([^\s]+)/;

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

							const codepath = resolve( this.cachedir, filename );
							const mappath = `${codepath}.${this.node.id}.map`;

							const { code, map } = processResult( result, data, src, dest );

							writeTransformedResult( this.node, code, map, codepath, mappath, dest )
								.then( () => options.cache[ filename ] = { codepath, mappath } )
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

	if ( match && /^data/.test( match[1] ) ) {
		match = /base64,(.+)$/.exec( match[1] );

		if ( !match ) {
			throw new Error( 'sourceMappingURL is not base64-encoded' );
		}

		let json = atob( match[1] );

		const map = processSourcemap( json, src, dest, original );
		code = code.replace( SOURCEMAP_COMMENT, '//# sourceMappingURL=data:application/json;charset=utf-8;base64,' + btoa( map ) );
	}

	return { code, map: null };
}

function useCachedTransformation ( node, cached, dest ) {
	// if there's no sourcemap involved, we can just copy
	// the previously generated code
	if ( !cached.mappath ) {
		return link( cached.codepath ).to( dest );
	}

	// otherwise, we need to write a new file with the correct
	// sourceMappingURL. (TODO is this really the best way?
	// What if sourcemaps had their own parallel situation? What
	// if the sourcemap itself has changed? Need to investigate
	// when I'm less pressed for time)
	return readFile( cached.codepath )
		.then( String )
		.then( code => {
			// remove any existing sourcemap comment
			code = code.replace( SOURCEMAP_COMMENT, '' ) +
				`\n//# sourceMappingURL=${dest}.${node.id}.map`;

			return Promise.all([
				writeFile( dest, code ),
				link( cached.mappath ).to( `${dest}.${node.id}.map` )
			]);
		});
}

function writeTransformedResult ( node, code, map, codepath, mappath, dest ) {
	if ( !map ) {
		return writeCode();
	}

	// remove any existing sourcemap comment
	code = code.replace( SOURCEMAP_COMMENT, '' );
	code += `\n//# sourceMappingURL=${dest}.${node.id}.map`;

	return Promise.all([
		writeCode(),
		writeFile( mappath, map ).then( () =>
			linkFile( mappath ).to( `${dest}.${node.id}.map` )
		)
	]);

	function writeCode () {
		return writeFile( codepath, code ).then( () =>
			// TODO use sander.link?
			linkFile( codepath ).to( dest )
		);
	}
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
	return JSON.stringify( map );
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