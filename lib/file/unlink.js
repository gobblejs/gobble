var fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	promo = require( 'promo' ),
	unlink = promo( fs.unlink );

module.exports = function () {
	return unlink( path.resolve.apply( path, arguments ) );
};
