var path = require( 'path' ),
	promo = require( 'promo' ),
	mkdir = promo( require( 'fs' ).mkdir );

module.exports = function () {
	var dir = path.resolve.apply( path, arguments );
	return mkdir( dir );
};
