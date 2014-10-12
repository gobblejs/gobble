var assert = require( 'assert' ),
	gobble = require( '../' );

module.exports = function () {
	describe( 'gobble.env()', function () {
		it( 'should default to "development"', function () {
			assert.equal( gobble.env(), 'development' );
		});

		it( 'inherits the value of GOBBLE_ENV', function () {
			process.env.GOBBLE_ENV = 'production';
			assert.equal( gobble.env(), 'production' );
		});
	});
};
