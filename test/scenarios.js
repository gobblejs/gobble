var assert = require( 'assert' ),
	request = require( 'request' ),
	gobble = require( '../' ),
	path = require( 'path' ),
	sander = require( 'sander' ),
	r = path.resolve.bind( null, __dirname ),
	sample = new RegExp( '^' + path.join( __dirname, 'sample' ) );

module.exports = function () {
	var task;

	describe( 'gobble', function () {
		beforeEach( function () {
			return sander.rimraf( __dirname, 'tmp' );
		});

		afterEach( function () {
			try {
				return task.close().then( cleanup );
			} catch ( err ) {

			} finally {
				task = null;
				return cleanup();
			}

			function cleanup () {
				return sander.rimraf( __dirname, 'tmp' );
			}
		});

		it( 'should bug out on non-existent directories (#12)', function () {
			assert.throws( function () {
				gobble( r( 'sample/nope' ) ).serve();
			}, /nope directory does not exist/ );
		});

		it( 'should correctly copy cached transformations of unchanged files with file transformers that change extensions (#14)', function ( done ) {
			function toTxt ( input ) {
				return input;
			}

			toTxt.defaults = { accept: '.md', ext: '.txt' };

			sander.copydir( __dirname, 'sample/foo' ).to( __dirname, 'tmp/foo' ).then( function () {
				var source = gobble( r( 'tmp/foo' ) );

				task = source.transform( toTxt ).serve();

				task.once( 'built', function () {
					task.once( 'built', function () {
						request( 'http://localhost:4567/foo.txt', function ( err, response, body ) {
							assert.equal( body.trim(), 'foo: this is some text' );
							done();
						});
					});

					// simulate a file change
					source.emit( 'error', {
						name: 'GobbleError',
						code: 'INVALIDATED',
						message: 'build invalidated',
						changes: [{ type: 'change', path: r( 'tmp/foo/foo.md' ) }]
					});
				});
			});
		});
	});


};
