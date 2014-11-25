var assert = require( 'assert' ),
	request = require( 'request' ),
	gobble = require( '../' ),
	path = require( 'path' ),
	sander = require( 'sander' ),
	r = path.resolve.bind( null, __dirname ),
	sample = new RegExp( '^' + path.join( __dirname, 'sample' ) );

gobble.cwd( __dirname );

function simulateChange ( source, change ) {
	source.emit( 'error', {
		name: 'GobbleError',
		code: 'INVALIDATED',
		message: 'build invalidated',
		changes: [{
			type: change.type,
			path: path.resolve( change.path )
		}]
	});
}

function copy ( inputdir, outputdir, options ) {
	return sander.copydir( inputdir ).to( outputdir );
}

module.exports = function () {
	var task;

	describe( 'gobble', function () {
		beforeEach( function () {
			return sander.rimraf( 'tmp' ).then( function () {
				return sander.copydir( 'sample' ).to( 'tmp' );
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
				return sander.rimraf( 'tmp' );
			}
		});

		it( 'should bug out on non-existent directories (#12)', function () {
			assert.throws( function () {
				gobble( 'sample/nope' ).serve();
			}, /nope directory does not exist/ );
		});

		it( 'should correctly copy cached transformations of unchanged files with file transformers that change extensions (#14)', function ( done ) {
			var source = gobble( 'tmp/foo' );

			function toTxt ( input ) {
				return input;
			}

			toTxt.defaults = { accept: '.md', ext: '.txt' };

			task = source.transform( toTxt ).serve();

			task.once( 'ready', function () {
				task.once( 'built', function () {
					request( 'http://localhost:4567/foo.txt', function ( err, response, body ) {
						assert.equal( response.statusCode, 200 );
						assert.equal( body.trim(), 'foo: this is some text' );
						done();
					});
				});

				simulateChange( source, {
					type: 'change',
					path: 'tmp/foo/foo.md'
				});
			});

			task.on( 'error', function ( err ) {
				setTimeout( function () {
					throw err;
				});
			});
		});

		it( 'should clean up after itself (#16)', function ( done ) {
			var source = gobble( 'tmp/foo' );

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


				simulateChange( source, {
					type: 'change',
					path: 'tmp/foo/foo.md'
				});
			});
		});

		it( 'should gracefully handle source nodes that appear twice (#19)', function ( done ) {
			var timesToRun = 100;

			run();

			// we need to run this a bunch of times, because the bug is non-deterministic!
			// (it depends on the timing of promise resolution, which we can't control)
			function run () {
				var source;

				if ( !--timesToRun ) {
					done();
				}

				source = gobble( 'tmp/foo' );

				task = gobble([ source, source ]).serve();

				task.once( 'ready', function () {
					task.once( 'built', function () {
						request( 'http://localhost:4567/bar.md', function ( err, response, body ) {
							try {
								assert.equal( response.statusCode, 200 );
								assert.equal( body.trim(), 'bar: this is some text' );
							} catch ( err ) {
								done( err );
							}

							task.close().then( run );
						});
					});

					simulateChange( source, {
						type: 'change',
						path: 'tmp/foo/foo.md'
					});
				});
			}
		});
	});


};
