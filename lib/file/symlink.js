var fs = require( 'fs' ),
	path = require( 'path' ),
	promo = require( 'promo' ),
	symlink = promo( fs.symlink );

module.exports = function ( srcPath, destPath ) {
	return symlink( srcPath, destPath );
};
