console.log( 'Running gobble.js tests. Please ensure that Gobble is not already running, otherwise tests may fail' );

process.chdir( __dirname );

require( 'source-map-support' ).install();

describe( 'gobble', function () {
	require( './env' )();
	require( './build' )();
	require( './serve' )();
	require( './watch' )();
	require( './initialisation' )();
	require( './sourcemaps' )();
	require( './scenarios' )();
});
