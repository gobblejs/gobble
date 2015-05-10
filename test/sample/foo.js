var gobble = require( '../../lib' ).default,
	path = require( 'path' );

module.exports = gobble( path.join( __dirname, 'foo' ) );
