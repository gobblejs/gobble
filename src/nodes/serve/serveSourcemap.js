import { crc32 } from 'crc';
import { dirname, relative, resolve } from 'path';
import { readFileSync } from 'sander';
import { load } from 'sorcery';

export default function serveSourcemap ( node, filepath, sourcemapPromises, request, response ) {
	const owner = filepath.slice( 0, -4 );

	if ( !sourcemapPromises[ filepath ] ) {
		sourcemapPromises[ filepath ] = load( owner )
			.then( chain => {
				if ( !chain ) {
					throw new Error( 'Could not resolve sourcemap for ' + owner );
				}

				const map = chain.apply();
				const dir = dirname( owner );
				const cwd = process.cwd();

				map.sources = map.sources.map( ( source, i ) => {
					const content = map.sourcesContent[i];
					const checksum = crc32( content );
					const originalSource = node.getFileFromChecksum( checksum );

					const absolutePath = resolve( dir, originalSource || source );

					return relative( cwd, absolutePath );
				});

				map.sourceRoot = 'file://' + process.cwd();

				return map.toString();
			});
	}

	return sourcemapPromises[ filepath ].then( map => {
		response.statusCode = 200;
		response.setHeader( 'Content-Type', 'application/json' );

		response.write( map );
		response.end();
	});
}