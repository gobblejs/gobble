var cwd;

module.exports = function () {
	if ( !cwd ) {
		gobblefile = require( 'findup-sync' )( 'gobblefile.js', { nocase: true });

		if ( !gobblefile ) {
			throw new Error( 'Could not find gobblefile.js' );
		}

		cwd = require( 'path' ).dirname( gobblefile );
	}

	return cwd;
};
