var gobble = require( '../../tmp' ).default,
	path = require( 'path' );

module.exports = gobble( path.join( __dirname, 'foo' ) );
