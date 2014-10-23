var assert = require( 'assert' ),
	path = require( 'path' ),
	sander = require( 'sander' ),

	sample = new RegExp( '^' + path.join( __dirname, 'sample' ) ),
	output = path.join( __dirname, 'output' );

module.exports = function () {
	describe( 'node.build()', function () {
		beforeEach( function () {
			// Clean up output dir
			return sander.rimraf( 'output' );
		});

		afterEach( function () {
			// Clear cache of sample build definitions
			Object.keys( require.cache ).forEach( function ( mod ) {
				if ( sample.test( mod ) ) {
					delete require.cache[ mod ];
				}
			});

			// Clean up output dir
			return sander.rimraf( 'output' );
		});

		it( 'should return a promise that fulfils on completion of build', function () {
			return require( './sample/foo' ).build({
				dest: output
			}).then( function () {
				return sander.readFile( output, 'foo.md' ).then( function ( data ) {
					assert.equal( data.toString().trim(), 'foo: this is some text' );
				});
			});
		});

		it( 'should throw an error if no `dest` is specified', function () {
			assert.throws( function () {
				require( './sample/foo' ).build();
			}, function ( err ) {
				return err.code === 'MISSING_DEST_DIR';
			});
		});
	});
};
