var assert = require( 'assert' ),
	gobble = require( '..' );

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
				if ( key.substr(-5) === '.node' ) return;
				tmpCache[ key ] = require.cache[ key ];
				delete require.cache[ key ];
			});

			process.env.GOBBLE_ENV = 'production';

			gobble = require( '..' );
			assert.equal( gobble.env(), 'production' );

			Object.keys( require.cache ).forEach( function ( key ) {
				require.cache[ key ] = tmpCache[ key ];
			});
		});
	});
};
