var path = require( 'path' ),
	config = exports;

config.gobblefile = require( 'findup-sync' )( 'gobblefile.js', { nocase: true });

if ( !config.gobblefile ) {
	throw new Error( 'Could not find gobblefile.js' );
}

config.cwd = path.dirname( config.gobblefile );
config.gobbledir = path.resolve( config.cwd, '.gobble' );
