var assert = require( 'assert' );
var sander = require( 'sander' );
var gobble = require( '..' );

function read (path) {
	return sander.readFileSync( path, { encoding: 'utf-8' }).trim();
}

module.exports = function () {
	describe( 'node.transform()', function () {
		beforeEach( function () {
			return Promise.all([
				sander.rimraf( '.gobble-build' ),
				sander.rimraf( 'tmp' )
			]).then( function () {
				return sander.copydir( 'sample' ).to( 'tmp' );
			});
		});

		it( 'should pass copy of default options to file transformers', function () {
			var count = 0;

			function checkOptions ( input, options ) {
				assert.equal( options.foo, 'bar' );
				options.foo = 'baz';
				count++;
				return input;
			}

			checkOptions.defaults = {
				foo: 'bar'
			};

			return gobble( 'tmp/foo' ).transform( checkOptions ).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.equal( count, 3 );
			});
		});

		it( 'should pass copy of default options to dir transformers', function () {
			var count = 0;

			function checkOptions ( indir, outdir, options, done ) {
				assert.equal( options.foo, 'bar' );
				options.foo = 'baz';
				count++;
				done();
			}

			checkOptions.defaults = {
				foo: 'bar'
			};

			return gobble( 'tmp/foo' ).transform( checkOptions ).build({
				dest: 'tmp/output'
			}).then ( function () {
				assert.equal( count, 1 );
			});
		});

		it( 'should allow file transforms to filter with a RegExp', function () {
			var count = 0;

			function checkFilter ( input ) {
				assert.equal( input.trim(), read( 'tmp/foo/foo.md' ) );
				count++;
				return input;
			}

			checkFilter.defaults = {
				accept: /foo\.md/
			};

			return gobble( 'tmp/foo' ).transform( checkFilter ).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.equal( count, 1 );
			});
		});

		it( 'should allow file transforms to change an extension', function () {
			var count = 0;

			function changeExtension ( input ) {
				count++;
				return input;
			}

			changeExtension.defaults = {
				ext: '.txt'
			};

			return gobble( 'tmp/foo' ).transform( changeExtension ).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.equal( count, 3 );
				assert.deepEqual( sander.lsrSync( 'tmp/output' ).sort(), [ 'foo.txt', 'bar.txt', 'baz.txt' ].sort() );
				assert.equal( read( 'tmp/output/foo.txt'), read( 'tmp/foo/foo.md' ) );
				assert.equal( read( 'tmp/output/bar.txt'), read( 'tmp/foo/bar.md' ) );
				assert.equal( read( 'tmp/output/baz.txt'), read( 'tmp/foo/baz.md' ) );
			});
		});

		it( 'should allow file transforms to change an extension of filtered with RegExp inputs', function () {
			var count = 0;

			function changeExtension ( input ) {
				count++;
				return input;
			}

			changeExtension.defaults = {
				accept: /foo\.md/,
				ext: '.txt'
			};

			return gobble( 'tmp/foo' ).transform( changeExtension ).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.equal( count, 1 );
				assert.deepEqual( sander.lsrSync( 'tmp/output' ).sort(), [ 'foo.txt', 'bar.md', 'baz.md' ].sort() );
			});
		});

		it( 'should skip files for file transforms which return null', function () {
			var count = 0;

			function nullFileTransform ( input ) {
				count++;
				return ~input.indexOf('foo') ? input : null;
			}

			return gobble( 'tmp/foo' ).transform( nullFileTransform ).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.equal( count, 3 );
				assert.deepEqual( sander.lsrSync( 'tmp/output' ), [ 'foo.md' ] );
			});
		});

		it( 'should use the specified encoding when reading files', function () {
			var count = 0;
			var foundBar = false;

			function plugin ( input ) {
				count++;
				if ( this.filename === 'bar.md' ) {
					foundBar = true;
					assert.equal(
						new Buffer( input, 'base64' ).toString('utf8').trim(),
						read( 'tmp/foo/bar.md' )
					);
				}
				return input.toString( 'base64' );
			}

			plugin.defaults = {
				sourceEncoding: 'base64'
			};

			return gobble( 'tmp/foo' ).transform( plugin ).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.equal( count, 3 );
				assert( foundBar );
			});
		});

		it( 'should read file as binary data if sourceEncoding === null', function () {
			function check ( input ) {
				assert.ok( input instanceof Buffer );
			}

			check.defaults = {
				sourceEncoding: null
			};

			return gobble( 'tmp/foo' ).transform( check ).build({
				dest: 'tmp/output'
			});
		});

		it( 'skips a transformer if condition is false', function () {
			return gobble( 'tmp/foo' ).transformIf( false, function ( input ) {
				return input.toUpperCase();
			}).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.equal( read( 'tmp/foo/foo.md' ), read( 'tmp/output/foo.md' ) );
			});
		});
	});
};
