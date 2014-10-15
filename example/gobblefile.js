var gobble = require( '../' );

module.exports = gobble([

	// the main index.html file, and the turkey logo
	gobble( 'src/root' ),

	// styles - convert from SCSS to CSS using the gobble-sass plugin
	gobble( 'src/styles' ).transform( 'sass', { src: 'main.scss', dest: 'main.css' }),

	// coffeescript - convert to javascript, then minify
	gobble( 'src/coffee' ).transform( 'coffee' ).transform( 'uglifyjs' ).transform( 'sorcery' )

]);
