var gobble = require( 'gobble' );

var src = gobble( 'src' );

module.exports = [
	src.exclude( 'scss/**' ).map( 'replace', { 'TITLE' : 'woop woop!' }),
	src.transform( 'sass', { src: 'scss/main.scss', dest: 'min.css' }),
	gobble( 'coffee' ).map( 'coffee' ),
	gobble( 'js' ).map( 'esnext' ),
	gobble( 'data' ).transform( 'spelunk', { dest: 'data5.json' }),
	gobble( 'es6' ).map( 'esperanto', { type: 'amd', defaultOnly: true }),
	gobble( 'ractive_components' ).map( 'ractive' )//.transform( throwError, { duration: 2000 })
];


function delay ( inputDir, outputDir, options, done ) {
	require( 'gobble' ).file.copydir( inputDir, outputDir );


	setTimeout( done, options.duration || 5000 );
}

function throwError ( inputDir, outputDir, options, done ) {
	setTimeout( function () {
		done( 'an error happened' );
	}, 1000 );
}
