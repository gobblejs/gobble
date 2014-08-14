var yabl = require( 'yabl' ),
	path = require( 'path' );

var tree = yabl( 'src/**' )
	/*.transform( function ( srcDir, destDir, done, helpers ) {
		helpers.write( path.join( destDir, 'yes.txt' ), 'it works!' ).then( done );
	});*/

module.exports = tree;
