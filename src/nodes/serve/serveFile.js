import { basename, extname } from 'path';
import { lookup } from 'mime';
import { readFile, stat, createReadStream } from 'sander';
import { getSourcemapComment, SOURCEMAP_COMMENT } from '../../utils/sourcemap';

export default function serveFile ( filepath, request, response ) {
	const ext = extname( filepath );

	// this might be turn out to be a really bad idea. But let's try it and see
	if ( ext === '.js' || ext === '.css' ) {
		return readFile( filepath ).then( data => {
			// this takes the auto-generated absolute sourcemap path, and turns
			// it into what you'd get with `gobble build` or `gobble watch`
			const sourcemapComment = getSourcemapComment( basename( filepath ) + '.map', ext );
			data = data.toString().replace( SOURCEMAP_COMMENT, sourcemapComment );

			response.statusCode = 200;
			response.setHeader( 'Content-Type', lookup( filepath ) );

			response.write( data );
			response.end();
		});
	}

	return stat( filepath ).then( stats => {
		response.statusCode = 200;
		response.setHeader( 'Content-Type', lookup( filepath ) );
		response.setHeader( 'Content-Length', stats.size );

		createReadStream( filepath ).pipe( response );
	});
}
