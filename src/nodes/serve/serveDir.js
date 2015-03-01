import { extname, resolve } from 'path';
import { statSync } from 'graceful-fs';
import { lookup } from 'mime';
import { exists, readdir } from 'sander';
import serveFile from './serveFile';
import templates from './templates';

export default function serveDir( filepath, request, response ) {
	var index = resolve( filepath, 'index.html' );

	return exists( index ).then( function ( exists ) {
		if ( exists ) {
			return serveFile( index, request, response );
		}

		return readdir( filepath ).then( function ( files ) {
			var items;

			items = files.map( function ( filename ) {
				var stats, isDir;

				stats = statSync( resolve( filepath, filename ) );
				isDir = stats.isDirectory();

				return {
					href: filename,
					isDir: isDir,
					type: isDir ? 'dir' : extname( filename )
				};
			});

			items.sort( function ( a, b ) {
				if ( ( a.isDir && b.isDir ) || ( !a.isDir && !b.isDir ) ) {
					return a.href < b.href ? 1 : -1;
				}

				return a.isDir ? -1 : 1;
			});

			return templates.dir().then( function ( dirTemplate ) {
				var html;

				html = dirTemplate({
					url: request.url,
					items: items.map( function ( item ) {
						return '<li class="' + item.type + '"><a href="' + item.href + '">' + item.href + '</a></li>';
					}).join( '' )
				});

				response.statusCode = 200;
				response.setHeader( 'Content-Type', lookup( 'html' ) );
				response.setHeader( 'Content-Length', html.length );

				response.write( html );
				response.end();
			});
		});
	});
}
