var resolve = require( 'path' ).resolve,
	Promise = require( 'promo' ).Promise,
	ls = require( './ls' ),
	copy = require( './copy' );

module.exports = function () {
	var src = resolve.apply( null, arguments );

	return {
		to: function () {
			var dest = resolve.apply( null, arguments );

			return ls( src ).then( function ( files ) {
				var promises = files.map( function ( filename ) {
					return copy( src, filename ).to( dest, filename );
				});

				return Promise.all( promises );
			}).then( function () {
				// this ensures no return value - prevents gotcha with copydir().then( done )
			});
		}
	};
};
