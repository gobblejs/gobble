var yabl = require( 'yabl' ),
	path = require( 'path' ),

	compileSass = require( './yabl-transformers/compileSass' ),

	src, styles, merged;

src = yabl( 'src' );

tree = yabl([
	src.exclude( 'scss/**' ),
	src.transform( compileSass, { src: 'scss/main.scss', dest: 'min.css' })
]);


module.exports = tree;
