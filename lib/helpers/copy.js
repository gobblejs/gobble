var Promise = require( 'promo' ).Promise,
	stat = require( './stat' ),
	read = require( './read' ),
	write = require( './write' );

module.exports = function ( src, dest ) {
	return stat( src ).then( function ( stats ) {
		var promise;

		if ( !stats.isFile() ) {
			return;
		}

		return read( src ).then( function ( data ) {
			return write( dest, data );
		});
	});
};
