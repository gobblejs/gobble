var fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	promo = require( 'promo' ),
	readdir = promo( fs.readdir );

module.exports = function () {
	return readdir( path.resolve.apply( path, arguments ) );
};
