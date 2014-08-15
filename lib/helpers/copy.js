var Promise = require( 'promo' ).Promise,
	stat = require( './stat' ),
	read = require( './read' ),
	write = require( './write' );

module.exports = function ( src, dest ) {
	var promises = [];

	stat( src ).then( function ( stats ) {
		var promise;

		if ( !stats.isFile() ) {
			return;
		}

		promise = read( src ).then( function ( data ) {
			return write( dest, data );
		});

		promises.push( promise );
	});

	return Promise.all( promises );
};
