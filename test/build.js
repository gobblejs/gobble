var assert = require( 'assert' );
var sander = require( 'sander' );
var gobble = require( '..' );

module.exports = function () {
	describe( 'node.build()', function () {
		beforeEach( function () {
			return Promise.all([
				sander.rimraf( '.gobble-build' ),
				sander.rimraf( 'tmp' )
			]).then( function () {
				return sander.copydir( 'sample' ).to( 'tmp' );
			});
		});

		it( 'should return a promise that fulfills on completion of build', function () {
			return gobble( 'tmp/foo' ).build({
				dest: 'tmp/output'
			}).then( function () {
				return sander.readFile( 'tmp/output/foo.md' );
			}).then( function ( data ) {
				assert.equal( data.toString().trim(), 'foo: this is some text' );
			});
		});

		it( 'should throw an error if no `dest` is specified', function () {
			return gobble( 'tmp/foo' ).build().then( function () {
				assert.fail();
			}).catch( function ( err ) {
				assert.equal( err.code, 'MISSING_DEST_DIR' );
			});
		});
	});
};
