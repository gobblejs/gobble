var gobble = require( 'gobble' );

module.exports = gobble([

	// the main index.html file, and the turkey logo
	gobble( 'src/root' ),

	// styles - convert from SCSS to CSS using the gobble-sass plugin
	gobble( 'src/styles' ).transform( 'sass', { src: 'main.scss', dest: 'main.css' }),

	// javascript - convert from ES6 to ES5 using the gobble-es6-transpiler plugin
	gobble( 'src/js' ).transform( 'es6-transpiler' )

]);
