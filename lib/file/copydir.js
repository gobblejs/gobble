var path = require( 'path' ),
	Promise = require( 'promo' ).Promise,
	ls = require( './ls' ),
	copy = require( './copy' ),
	exists = require( './exists' );

module.exports = function ( src, dest ) {
	return exists( src ).then( function ( exists ) {
		if ( !exists ) {
			console.log( 'GOBBLE WARNING: Attempted to copy a non-existent folder (' + src + ')' );
			return;
		}

		return ls( src ).then( function ( files ) {
			var promises = files.map( function ( filename ) {
				return copy( path.resolve( src, filename ), path.resolve( dest, filename ) );
			});

			return Promise.all( promises );
		});
	}).then( function () {
		// this ensures no return value - prevents gotcha with copydir().then( done )
	});
};
