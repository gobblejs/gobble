var fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	promo = require( 'promo' ),
	rimraf = promo( require( 'rimraf' ), {});

module.exports = function () {
	var file = path.join.apply( path, arguments );
	return rimraf( file );
};
