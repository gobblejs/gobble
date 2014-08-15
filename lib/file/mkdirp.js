var path = require( 'path' ),
	promo = require( 'promo' ),
	mkdirp = promo( require( 'mkdirp' ) );

module.exports = function () {
	var dir = path.join.apply( path, arguments );
	return mkdirp( dir );
};
