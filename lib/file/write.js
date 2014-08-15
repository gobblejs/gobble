var fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	promo = require( 'promo' ),
	mkdirp = promo( require( 'mkdirp' ) ),
	writeFile = promo( fs.writeFile );

module.exports = function () {
	var dest = Array.prototype.slice.call( arguments, 0, -1 ), data = arguments[ arguments.length - 1 ];

	dest = path.join.apply( path, dest );

	return mkdirp( path.dirname( dest ) ).then( function () {
		return writeFile( dest, data );
	});
};
