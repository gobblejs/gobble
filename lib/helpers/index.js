var promo = require( 'promo' ),
	Promise = promo.Promise,
	fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	mkdirp = promo( require( 'mkdirp' ) ),
	glob = promo( require( 'glob' ) ),

	stat = promo( fs.stat ),
	readdir = promo( fs.readdir ),
	readFile = promo( fs.readFile ),
	writeFile = promo( fs.writeFile ),
	unlink = promo( fs.unlink ),

	debug = require( '../utils/debug' ),

	copy, exists, read, write, ls;

copy = function ( src, dest ) {
	var promises = [];

	stat( src ).then( function ( stats ) {
		var promise;

		if ( !stats.isFile() ) {
			return;
		}

		promise = read( src ).then( function ( data ) {
			return write( dest, data );
		});

		promises.push( promise );
	});

	return Promise.all( promises );
};

exists = function ( file ) {
	return stat( file ).then( function () {
		return true;
	}, function () {
		return false;
	});
};

read = function () {
	return readFile( path.join.apply( path, arguments ) );
};

write = function () {
	var dest = Array.prototype.slice.call( arguments, 0, -1 ), data = arguments[ arguments.length - 1 ];

	dest = path.join.apply( path, dest );

	return mkdirp( path.dirname( dest ) ).then( function () {
		return writeFile( dest, data );
	});
};

ls = function ( dir ) {
	var result = [];

	function processDir ( dir ) {
		console.log( 'processing', dir );
		return readdir( dir ).then( function ( files ) {
			console.log( dir, 'contains', files );
			var promises = files.map( function ( file ) {
				var filepath = path.join( dir, file );

				console.log( 'statting', filepath );

				return stat( filepath ).then( function ( stats ) {
					if ( stats.isDirectory() ) {
						return processDir( filepath );
					}

					console.log( 'pushing', filepath );

					result.push( filepath );
				});
			});

			return Promise.all( promises );
		});
	}

	return processDir( dir ).then( function () {
		return result.map( function ( file ) {
			return path.relative( dir, file );
		});
	});
};

var yablfs = {
	stat: stat,
	readdir: readdir,
	read: read,
	write: write,
	unlink: unlink,

	copy: copy,
	exists: exists,
	ls: ls,

	mkdirp: mkdirp,
	glob: glob
};

module.exports = yablfs;
