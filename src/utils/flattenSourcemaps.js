import { basename, dirname, extname, relative, resolve } from 'path';
import { lsr, readFileSync, writeFile } from 'sander';
import * as mapSeries from 'promise-map-series';
import { load } from 'sorcery';
import { crc32 } from 'crc';
import { SOURCEMAP_COMMENT, getSourcemapComment } from './sourcemap';

const whitelist = { '.js': true, '.css': true };

export default function flattenSourcemaps ( node, inputdir, outputdir, base, task ) {
	return lsr( inputdir ).then( files => {
		const jsAndCss = files.filter( file => whitelist[ extname( file ) ] );

		return mapSeries( jsAndCss, file => {
			return load( resolve( inputdir, file ) )
				.then( chain => {
					if ( chain ) {
						const map = chain.apply({ base });

						map.sources = map.sources.map( source => {
							const checksum = crc32( readFileSync( base, source ) );
							const originalSource = node.getFileFromChecksum( checksum );

							const dir = dirname( resolve( base, file ) );
							return originalSource ? relative( dir, originalSource ) : source;
						});

						const code = readFileSync( inputdir, file, { encoding: 'utf-8' })
							.replace( SOURCEMAP_COMMENT, getSourcemapComment( encodeURI( basename( file + '.map' ) ), extname( file ) ) );

						return Promise.all([
							writeFile( outputdir, file, code ),
							writeFile( outputdir, file + '.map', map.toString() )
						]);
					}
				})
				.catch( err => {
					task.emit( 'error', err );
				});
			});
	})
	.then( () => inputdir );
}