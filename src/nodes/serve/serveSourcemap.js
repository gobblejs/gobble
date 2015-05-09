import { load } from 'sorcery';

export default function serveSourcemap ( filepath, sourcemapPromises, request, response ) {
	const owner = filepath.slice( 0, -4 );

	if ( !sourcemapPromises[ filepath ] ) {
		sourcemapPromises[ filepath ] = load( owner )
			.then( chain => {
				if ( !chain ) {
					throw new Error( 'Could not resolve sourcemap for ' + owner );
				}

				return chain.apply().toString();
			});
	}

	return sourcemapPromises[ filepath ].then( map => {
		response.statusCode = 200;
		response.setHeader( 'Content-Type', 'application/json' );

		response.write( map );
		response.end();
	});
}