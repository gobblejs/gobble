var gobble = require( 'gobble' );

var src = gobble( 'src' );

module.exports = [
	src.exclude( 'scss/**' ).map( 'replace', { 'TITLE' : 'woop woop!' }),
	src.transform( 'sass', { src: 'scss/main.scss', dest: 'min.css' }),
	gobble( 'coffee' ).map( 'coffee' ),
	gobble( 'js' ).map( 'esnext' ),
	gobble( 'data' ).transform( 'spelunk', { dest: 'data5.json' })
];
