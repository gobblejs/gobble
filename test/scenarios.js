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
			return sander.rimraf( __dirname, 'tmp' ).then( function () {
				return sander.copydir( __dirname, 'sample' ).to( __dirname, 'tmp' );
			});
		});

		afterEach( function () {
			try {
				return task.close().then( cleanup );
			} catch ( err ) {
				if ( task ) {
					throw err;
				}
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
			var source = gobble( r( 'tmp/foo' ) );

			function toTxt ( input ) {
				return input;
			}

			toTxt.defaults = { accept: '.md', ext: '.txt' };

			task = source.transform( toTxt ).serve();

			task.once( 'ready', function () {
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

		it( 'should clean up after itself (#16)', function ( done ) {
			var source = gobble( r( 'tmp/foo' ) );

			function foo ( inputdir, outputdir, options ) {
				return sander.copydir( inputdir ).to( outputdir );
			}

			task = source.transform( foo ).serve();

			task.once( 'ready', function () {
				task.once( 'built', function () {
					sander.readdir( '.gobble' ).then( function ( files ) {
						// find foo tmpdir
						files = files.filter( function ( file ) { return /-foo$/.test( file ); });

						sander.readdir( '.gobble', files[0] ).then( function ( files ) {
							assert.deepEqual( files, [ '2' ] );
							done();
						});
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


};
