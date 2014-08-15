var gobble = require( 'gobble' ),
	compileSass = require( './gobblers/compileSass' ),
	replace = require( './gobblers/replace' ),
	src;

src = gobble( 'src' );

module.exports = gobble([
	src.exclude( 'scss/**' ).map( replace, { 'TITLE' : 'woop woop!' }),
	src.transform( compileSass, { src: 'scss/main.scss', dest: 'min.css' })
]);
