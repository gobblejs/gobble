var path = require( 'path' ),
	fs = require( 'fs' ),
	mime = require( 'mime' ),
	file = require( '../file' ),
	serveFile = require( './serveFile' ),
	templates = {};

templates.dir = function () {
	var promise;

	if ( !promise ) {
		promise = file.read( path.resolve( __dirname, 'templates/dir.html' ) ).then( function ( t ) {
			t = t.toString();

			return function ( replacers ) {
				return t.replace( /\$\{([^\}]+)\}/g, function ( match, $1 ) {
					return replacers[ $1 ] || match;
				});
			};
		});
	}

	return promise;
};

module.exports = function serveDir( filepath, request, response ) {
	var index = path.resolve( filepath, 'index.html' );

	return file.exists( index ).then( function ( exists ) {
		if ( exists ) {
			return serveFile( index, request, response );
		}

		return file.readdir( filepath ).then( function ( files ) {
			var items;

			items = files.map( function ( filename ) {
				var stats, isDir;

				stats = require( 'fs' ).statSync( path.resolve( filepath, filename ) );
				isDir = stats.isDirectory();

				return {
					href: filename,
					isDir: isDir,
					type: isDir ? 'dir' : path.extname( filename )
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
				response.setHeader( 'Content-Type', mime.lookup( 'html' ) );
				response.setHeader( 'Content-Length', html.length );

				response.write( html );
				response.end();
			});
		});
	});
};
