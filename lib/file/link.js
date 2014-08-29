var resolve = require( 'path' ).resolve,
	fs = require( 'fs' ),
	path = require( 'path' ),
	promo = require( 'promo' ),
	mkdirp = require( './mkdirp' ),
	symlink = promo( fs.symlink );

module.exports = function () {
	var src = resolve.apply( null, arguments );

	return {
		to: function () {
			var dest = resolve.apply( null, arguments );

			return mkdirp( path.dirname( dest ) ).then( function () {
				return symlink( src, dest );
			});
		}
	};
};
