var promo = require( 'promo' ),
	Promise = promo.Promise,
	fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	mkdirp = promo( require( 'mkdirp' ) ),
	glob = promo( require( 'glob' ) ),

	stat = promo( fs.stat ),
	readdir = promo( fs.readdir ),
	read = promo( fs.readFile ),
	writeFile = promo( fs.writeFile ),
	unlink = promo( fs.unlink ),

	debug = require( '../utils/debug' ),

	copy, exists, read, write;

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

write = function ( dest, data ) {
	return mkdirp( path.dirname( dest ) ).then( function () {
		return writeFile( dest, data );
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

	mkdirp: mkdirp,
	glob: glob
};

module.exports = yablfs;
