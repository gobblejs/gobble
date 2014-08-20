var resolve = require( 'path' ).resolve,
	promo = require( 'promo' ),
	rimraf = promo( require( 'rimraf' ), {});

module.exports = function () {
	var filepath = resolve.apply( null, arguments );
	return rimraf( filepath );
};
