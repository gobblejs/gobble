var cwd;

module.exports = function () {
	if ( !cwd ) {
		yablfile = require( 'findup-sync' )( 'yablfile.js', { nocase: true });

		if ( !yablfile ) {
			throw new Error( 'Could not find yablfile.js' );
		}

		cwd = require( 'path' ).dirname( yablfile );
	}

	return cwd;
};
