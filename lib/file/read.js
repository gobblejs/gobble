var fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	promo = require( 'promo' ),
	readFile = promo( fs.readFile );

module.exports = function () {
	return readFile( path.join.apply( path, arguments ) );
};
