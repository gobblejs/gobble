import { extname, resolve } from 'path';
import { statSync } from 'graceful-fs';
import { lookup } from 'mime';
import { exists, readdir } from 'sander';
import serveFile from './serveFile';
import dirTemplate from './templates/dir';

export default function serveDir ( filepath, request, response ) {
	const index = resolve( filepath, 'index.html' );

	return exists( index ).then( exists => {
		if ( exists ) {
			return serveFile( index, request, response );
		}

		return readdir( filepath ).then( files => {
			let items = files.map( href => {
				const stats = statSync( resolve( filepath, href ) );
				const isDir = stats.isDirectory();

				return {
					isDir,
					href,
					type: isDir ? 'dir' : extname( href )
				};
			});

			items.sort( ( a, b ) => {
				if ( ( a.isDir && b.isDir ) || ( !a.isDir && !b.isDir ) ) {
					return a.href < b.href ? 1 : -1;
				}

				return a.isDir ? -1 : 1;
			});

			const html = dirTemplate({
				url: request.url,
				items: items
					.map( item => `<li class="${item.type}"><a href="${item.href}">${item.href}</a></li>` )
					.join( '' )
			});

			response.statusCode = 200;
			response.setHeader( 'Content-Type', lookup( 'html' ) );
			response.setHeader( 'Content-Length', html.length );

			response.write( html );
			response.end();
		});
	});
}
