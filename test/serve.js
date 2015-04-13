var assert = require( 'assert' ),
	request = require( 'request' ),
	path = require( 'path' ),
	sample = new RegExp( '^' + path.join( __dirname, 'sample' ) );

module.exports = function () {
	describe( 'node.serve()', function () {
		afterEach( function () {
			// Clear cache of sample build definitions
			Object.keys( require.cache ).forEach( function ( mod ) {
				if ( sample.test( mod ) ) {
					delete require.cache[ mod ];
				}
			});
		});

		it( 'should serve to the specified port', function ( done ) {
			var task = require( './sample/foo' ).serve({
				port: 6789
			});

			task.on( 'ready', function () {
				request( 'http://localhost:6789/foo.md', function ( err, response, body ) {
					assert.equal( body.trim(), 'foo: this is some text' );
					task.close().then( done );
				});
			});
		});

		it( 'should default to port 4567', function ( done ) {
			var task = require( './sample/foo' ).serve();

			task.on( 'ready', function () {
				request( 'http://localhost:4567/foo.md', function ( err, response, body ) {
					assert.equal( body.trim(), 'foo: this is some text' );
					task.close().then( done );
				});
			});

			task.on( 'error', function ( err ) {
				task.close();
				done( err );
			});
		});
	});
};
