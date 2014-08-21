var fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	promo = require( 'promo' ),
	lstat = promo( fs.lstat );

module.exports = function () {
	var filepath = path.resolve.apply( path, arguments );
	return lstat( filepath );
};
