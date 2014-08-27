var gobble = require( 'gobble' );

var src = gobble( 'src' );

module.exports = gobble([
	src.exclude( 'scss/**' ).map( 'replace', { 'TITLE' : 'woop woop!' }),
	src.map( 'replace', { 'TITLE' : 'woop woop!' }),
	src.transform( 'sass', { src: 'scss/main.scss', dest: 'min.css' }),
	gobble( 'coffee' ).map( 'coffee' ),
	gobble( 'js' ).map( 'es6-transpiler' ),
	gobble( 'data' ).transform( 'spelunk', { dest: 'data5.json' }),
	gobble( 'es6' ).map( 'esperanto', { type: 'amd', defaultOnly: true }),
	gobble( 'ractive_components' ).map( 'ractive' )
]);
