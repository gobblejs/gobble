var path = require( 'path' ),
	promo = require( 'promo' ),
	glob = promo( require( 'glob' ) );

module.exports = function () {
	var pattern = path.resolve.apply( path, arguments );
	return glob( pattern );
};
