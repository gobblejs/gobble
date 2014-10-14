console.log( 'Running gobble.js tests. Please ensure that Gobble is not already running, otherwise tests may fail' );

require( './env' )();
require( './build' )();
require( './serve' )();
require( './scenarios' )();
