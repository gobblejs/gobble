var gobble = require( 'gobble' ),
	sass = require( 'gobble-sass' ),
	replace = require( './gobblers/replace' ),
	src;

src = gobble( 'src' );

module.exports = gobble([
	src.exclude( 'scss/**' ).map( replace, { 'TITLE' : 'woop woop!' }),
	src.transform( sass, { src: 'scss/main.scss', dest: 'min.css' })
]);
