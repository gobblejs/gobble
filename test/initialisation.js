var assert = require( 'assert' );
var gobble = require( '..' );

gobble.cwd( __dirname );

module.exports = function () {
	describe( 'initialisation', function () {
		it( 'errors on non-existent directories (#12)', function () {
			assert.throws( function () {
				gobble( 'sample/nope' );
			}, /nope directory does not exist/ );
		});

		it( 'errors if you try to pass multiple nodes to gobble()', function () {
			assert.throws( function () {
				gobble( 'tmp/foo', 'tmp/bar' );
			}, /could not process input/ );
		});

		it( 'errors if an input array member is invalid', function () {
			assert.throws( function () {
				gobble([ 42 ]);
			}, /could not process input/ );
		});
	});
};
