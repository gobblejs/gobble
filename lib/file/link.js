var resolve = require( 'path' ).resolve,
	fs = require( 'fs' ),
	path = require( 'path' ),
	promo = require( 'promo' ),
	mkdirp = require( './mkdirp' ),
	symlinkOrCopy = require( 'symlink-or-copy' ).sync;

module.exports = function () {
	var src = resolve.apply( null, arguments );

	return {
		to: function () {
			var dest = resolve.apply( null, arguments );

			return mkdirp( path.dirname( dest ) ).then( function () {
				symlinkOrCopy( src, dest );
			});
		}
	};
};
