var yabl = require( 'yabl' ),
	path = require( 'path' );

var tree = yabl( 'src/**' )
	.pipe( function ( srcDir, destDir, done, helpers ) {
		helpers.writeFile( path.join( destDir, 'yes.txt' ), 'it works!' ).then( done );
	});

console.log( 'tree', tree );
module.exports = tree;
