var path = require( 'path' );
var assert = require( 'assert' );
var sander = require( 'sander' );
var gobble = require( '..' );

module.exports = function () {
	describe( 'initialisation', function () {
		beforeEach( function () {
			return Promise.all([
				sander.rimraf( '.gobble-build' ),
				sander.rimraf( 'tmp' )
			]).then( function () {
				return sander.copydir( 'sample' ).to( 'tmp' );
			});
		});

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

		it( 'gets changes', function () {
			var node = gobble( 'tmp' );
			var changes1 = node.getChanges( 'tmp' );
			assert.equal( changes1.length, 13 );
			changes1.forEach( function ( change ) {
				assert.ok( change.added );
			});
			sander.rimrafSync( 'tmp/foo' )
			sander.rimrafSync( 'tmp/bar/a/dir/a.md' );
			sander.writeFileSync( 'tmp/bar/a/dir/a.md', 'Hello,', { encoding: 'utf-8' } );
			sander.writeFileSync( 'tmp/bar/c.md', 'World!', { encoding: 'utf-8' } );
			var changes2 = node.getChanges( 'tmp' );
			assert.equal( changes2.length, 5 );
			changes2.forEach( function ( change ) {
				switch ( change.file ) {
					case path.normalize( 'bar/c.md' ):
						assert.ok( change.added );
						break;
					case path.normalize( 'foo/bar.md' ):
						assert.ok( change.removed );
						break;
					case path.normalize( 'foo/baz.md' ):
						assert.ok( change.removed );
						break;
					case path.normalize( 'foo/foo.md' ):
						assert.ok( change.removed );
						break;
					case path.normalize( 'bar/a/dir/a.md' ):
						assert.ok( change.changed );
						break;
					default:
						assert.fail();
				}
			});
		});
	});
};
