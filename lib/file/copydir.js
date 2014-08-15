var path = require( 'path' ),
	Promise = require( 'promo' ).Promise,
	ls = require( './ls' )
	copy = require( './copy' );

module.exports = function ( src, dest ) {
	return ls( src ).then( function ( files ) {
		var promises = files.map( function ( filename ) {
			return copy( path.join( src, filename ), path.join( dest, filename ) );
		});

		return Promise.all( promises );
	});
};
