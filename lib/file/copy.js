var resolve = require( 'path' ).resolve,
	stat = require( './stat' ),
	read = require( './read' ),
	write = require( './write' );

module.exports = function () {
	var src = resolve.apply( null, arguments );

	return {
		to: function () {
			var dest = resolve.apply( null, arguments );

			return stat( src ).then( function ( stats ) {
				if ( !stats.isFile() ) {
					return;
				}

				return read( src ).then( function ( data ) {
					return write( dest, data );
				});
			});
		}
	};
};
