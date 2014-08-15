var yabl = require( 'yabl' ),
	path = require( 'path' ),

	src, styles, merged;

tree = yabl( 'src/**' );//.include( '**/README.md' );
tree = yabl([ tree, 'src/**' ]);//.include( '**/README.md' );

// styles = yabl( 'src/scss/**/*.scss' )
// 	.transform( compileSass, { src: 'src/scss/main.scss', dest: 'min.css' });

// merged = yabl([ tree, styles ]);

// function compileSass ( srcDir, destDir, options, done ) {
// 	var sass = require( 'node-sass' );

// 	sass.render({
// 		file: path.join( srcDir, options.src ),
// 		success: function ( css ) {
// 			yabl.helpers.write( destDir, options.dest, css ).then( done );
// 		}
// 	});
// }


//module.exports = merged;
module.exports = tree;
