var assert = require( 'assert' );
var path = require( 'path' );
var request = require( 'request-promise' );
var gobble = require( '../lib' ).default;
var sander = require( 'sander' );
var SourceMapConsumer = require( 'source-map' ).SourceMapConsumer;
var simulateChange = require( './utils/simulateChange' );

var Promise = sander.Promise;

gobble.cwd( __dirname );

function identity ( input ) {
	return input;
}

module.exports = function () {
	var task;

	describe( 'initialisation', function () {
		beforeEach( function () {
			return sander.rimraf( 'tmp' ).then( function () {
				return sander.copydir( 'sample' ).to( 'tmp' );
			});
		});

		afterEach( function () {
			try {
				return task.close().then( cleanup );
			} catch ( err ) {
				if ( task ) {
					throw err;
				}
			} finally {
				task = null;
				return cleanup();
			}

			function cleanup () {
				return sander.rimraf( 'tmp' );
			}
		});

		it( 'should bug out on non-existent directories (#12)', function () {
			assert.throws( function () {
				gobble( 'sample/nope' ).serve();
			}, /nope directory does not exist/ );
		});
	});
};
