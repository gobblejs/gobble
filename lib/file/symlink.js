var fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	promo = require( 'promo' ),
	mkdirp = require( 'mkdirp' ),
	symlink = promo( fs.symlink );

module.exports = function ( srcPath, destPath ) {
	mkdirp.sync( path.dirname( srcPath ) );
	mkdirp.sync( path.dirname( destPath ) );

	return symlink( srcPath, destPath );
	// .catch( function ( err ) {
	// 	console.log( 'ERR>>>', err );
	//
	// 	console.log( fs.statSync( srcPath ) );
	// 	throw err;
	// });
};
