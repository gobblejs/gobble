var assert = require( 'assert' ),
	path = require( 'path' ),
	sander = require( 'sander' ),
	gobble = require( '../lib' ).default;
	sample = new RegExp( '^' + path.join( __dirname, 'sample' ) );

module.exports = function () {
	describe( 'node.build()', function () {
		beforeEach( function () {
			return sander.rimraf( 'tmp' ).then( function () {
				return sander.copydir( 'sample' ).to( 'tmp' );
			});
		});

		afterEach( function () {
			return sander.rimraf( 'tmp' );
		});

		it( 'should return a promise that fulfills on completion of build', function () {
			return gobble( 'tmp/foo' ).build({
				dest: 'tmp/output'
			}).then( function () {
				return sander.readFile( 'tmp/output', 'foo.md' ).then( function ( data ) {
					assert.equal( data.toString().trim(), 'foo: this is some text' );
				});
			});
		});

		it( 'should stop completion of build', function () {
			var node = gobble( 'tmp/foo' );
			var task = node.build({
				dest: 'tmp/output'
			});
			return task.then( function () {
				assert.equal(node.active(), false);

				return sander.readFile( 'tmp/output', 'foo.md' ).then( function ( data ) {
					assert.equal( data.toString().trim(), 'foo: this is some text' );
				});
			});
		});

		it( 'should throw an error if no `dest` is specified', function () {
			assert.throws( function () {
				gobble( 'tmp/foo' ).build();
			}, function ( err ) {
				return err.code === 'MISSING_DEST_DIR';
			});
		});
	});
};
