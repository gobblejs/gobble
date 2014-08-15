var path = require( 'path' ),
	promo = require( 'promo' ),
	glob = promo( require( 'glob' ) );

module.exports = function () {
	var pattern = path.join.apply( path, arguments );
	return glob( pattern );
};
