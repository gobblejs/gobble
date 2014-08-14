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

	copy, exists;

copy = function ( src, dest ) {
	var promises = [];

	stat( src ).then( function ( stats ) {
		var promise;

		if ( !stats.isFile() ) {
			return;
		}

		promise = readFile( src ).then( function ( data ) {
			return mkdirp( path.dirname( dest ) ).then( function () {
				return writeFile( dest, data );
			});
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
}

var yablfs = {
	stat: stat,
	readdir: readdir,
	readFile: readFile,
	writeFile: writeFile,
	unlink: unlink,

	copy: copy,
	exists: exists,

	mkdirp: mkdirp,
	glob: glob
};

module.exports = yablfs;
