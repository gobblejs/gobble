var path = require( 'path' );
var assert = require( 'assert' );
var sander = require( 'sander' );
var gobble = require( '..' );

module.exports = function () {
	describe( 'node builtins transformers', function () {
		beforeEach( function () {
			return Promise.all([
				sander.rimraf( '.gobble-build' ),
				sander.rimraf( 'tmp' )
			]).then( function () {
				return sander.copydir( 'sample' ).to( 'tmp' );
			});
		});

		it( 'includes files via glob pattern', function () {
			return gobble( 'tmp/foo' ).include( '{bar,baz}.md' ).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.deepEqual( sander.lsrSync( 'tmp/output' ), [ 'bar.md', 'baz.md' ] );
			});
		});

		it( 'includes files via array of glob patterns', function () {
			return gobble( 'tmp/foo' ).include( [ 'bar.md', 'baz.md' ] ).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.deepEqual( sander.lsrSync( 'tmp/output' ), [ 'bar.md', 'baz.md' ] );
			});
		});

		it( 'excludes files via glob pattern', function () {
			return gobble( 'tmp/foo' ).exclude( '{bar,baz}.md' ).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.deepEqual( sander.lsrSync( 'tmp/output' ), [ 'foo.md' ] );
			});
		});

		it( 'excludes files via array of glob patterns', function () {
			return gobble( 'tmp/foo' ).exclude( [ 'bar.md', 'baz.md' ] ).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.deepEqual( sander.lsrSync( 'tmp/output' ), [ 'foo.md' ] );
			});
		});

		it.skip( 'grabs subdirectory', function () {
			return gobble( 'tmp/bar' ).grab( 'a' ).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.deepEqual( sander.lsrSync( 'tmp/output' ), [
					path.normalize( 'dir/a.md' )
				]);
			});
		});

		it( 'errors on .grab(path1, path2)', function () {
			assert.throws( function () {
				gobble( 'tmp/foo' ).grab( 'a', 'b' );
			}, /cannot pass multiple strings/ );
		});

		it( 'moves to with specified folder', function () {
			return gobble( 'tmp/foo' ).moveTo( 'wrapper' ).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.deepEqual( sander.lsrSync( 'tmp/output' ), [
					path.normalize( 'wrapper/bar.md' ),
					path.normalize( 'wrapper/baz.md' ),
					path.normalize( 'wrapper/foo.md' )
				]);
			});
		});

		it( 'errors on .moveTo(path1, path2)', function () {
			assert.throws( function () {
				gobble( 'tmp/foo' ).moveTo( 'a', 'b' );
			}, /cannot pass multiple strings/ );
		});
	});
};
