var fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	promo = require( 'promo' ),
	stat = promo( fs.stat );

module.exports = function () {
	var filepath = path.resolve.apply( path, arguments );
	return stat( filepath );
};
