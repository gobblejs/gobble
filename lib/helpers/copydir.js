var path = require( 'path' ),
	Promise = require( 'promo' ).Promise,
	ls = require( './ls' )
	copy = require( './copy' );

module.exports = function ( src, dest ) {
	return ls( src ).then( function ( files ) {
		var promises = files.map( function ( file ) {
			return copy( path.join( src, file ), path.join( dest, file ) );
		});

		return Promise.all( promises );
	});
};
