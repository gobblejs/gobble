var assert = require( 'assert' ),
	gobble = require( '../tmp' ).default;

module.exports = function () {
	describe( 'gobble.env()', function () {
		it( 'should default to "development"', function () {
			assert.equal( gobble.env(), 'development' );
		});

		it( 'can set the value', function () {
			gobble.env( 'foo' );
			assert.equal( gobble.env(), 'foo' );
		});

		it( 'inherits the value of GOBBLE_ENV', function () {
			var tmpCache = {}, gobble;

			Object.keys( require.cache ).forEach( function ( key ) {
				tmpCache[ key ] = require.cache[ key ];
				delete require.cache[ key ];
			});

			process.env.GOBBLE_ENV = 'production';

			gobble = require( '../tmp' ).default;
			assert.equal( gobble.env(), 'production' );

			Object.keys( require.cache ).forEach( function ( key ) {
				require.cache[ key ] = tmpCache[ key ];
			});
		});
	});
};
