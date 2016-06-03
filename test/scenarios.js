var assert = require( 'assert' );
var path = require( 'path' );
var request = require( 'request-promise' );
var gobble = require( '..' );
var sander = require( 'sander' );
var SourceMapConsumer = require( 'source-map' ).SourceMapConsumer;
var simulateChange = require( './utils/simulateChange' );

var Promise = sander.Promise;

gobble.cwd( __dirname );

function identity ( input ) {
	return input;
}

module.exports = function () {
	var task;

	describe( 'scenarios', function () {
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

		it( 'should correctly copy cached transformations of unchanged files with file transformers that change extensions (#14)', function ( done ) {
			var source = gobble( 'tmp/foo' );

			function toTxt ( input ) {
				return input;
			}

			toTxt.defaults = { accept: '.md', ext: '.txt' };

			task = source.transform( toTxt ).serve();

			task.once( 'ready', function () {
				task.once( 'built', function () {
					request( 'http://localhost:4567/foo.txt' ).then( function ( body ) {
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

		it( 'should allow a single file as a source node (#23)', function ( done ) {
			var source = gobble( 'tmp/foo/foo.md' ), count = 0;

			function check ( indir, outdir, options, done ) {
				assert.deepEqual( sander.lsrSync( indir ), [ 'foo.md' ] );
				count++;
				done();
			}

			task = source.transform( check ).watch({
				dest: 'tmp/output'
			});

			task.once( 'built', function () {
				task.once( 'built', function () {
					if ( count === 2 ) {
						done();
					} else {
						done( new Error( 'Expected count to be 2, not ', count ) );
					}
				});

				simulateChange( source, {
					type: 'change',
					path: source.targetFile
				});
			});
		});

		it( 'nodes that appear multiple times should only emit info events once (serve/watch)', function ( done ) {
			var a, b, c, info = [];

			function copy ( inputdir, outputdir, options ) {
				return sander.writeFile( outputdir, 'foo.md', '' + Math.random() );
			}

			a = gobble( 'tmp/foo' ).transform( copy );
			b = a.transform( copy );
			c = a.transform( copy );

			task = gobble([ b, c ]).serve();

			task.on( 'info', function ( message ) {
				info.push( message );
			});

			task.once( 'built', function () {
				task.once( 'built', function () {
					var message;

					while ( message = info.pop() ) {
						if ( ~info.indexOf( message ) ) {
							done( new Error( 'Message was duplicated' ) );
						}
					}

					done();
				});

				simulateChange( a, {
					type: 'change',
					path: 'tmp/foo/foo.md'
				});
			});
		});

		it( 'nodes that appear multiple times should only emit info events once (build)', function ( done ) {
			var a, b, c, info = [];

			function copy ( inputdir, outputdir, options ) {
				return sander.writeFile( outputdir, 'foo.md', '' + Math.random() );
			}

			a = gobble( 'tmp/foo' ).transform( copy );
			b = a.transform( copy );
			c = a.transform( copy );

			task = gobble([ b, c ]).build({
				dest: 'tmp/output'
			});

			task.on( 'info', function ( message ) {
				info.push( message );
			});

			task.then( function () {
				var message;

				while ( message = info.pop() ) {
					if ( ~info.indexOf( message ) ) {
						done( new Error( 'Message was duplicated' ) );
					}
				}

				done();
			});
		});

		it( 'should gracefully handle source nodes that appear twice (#19)', function ( done ) {
			var timesToRun = 100;

			this.timeout( 10000 );

			run();

			// we need to run this a bunch of times, because the bug is non-deterministic!
			// (it depends on the timing of promise resolution, which we can't control)
			function run () {
				var source;

				if ( !--timesToRun ) {
					return done();
				}

				source = gobble( 'tmp/foo' );

				task = gobble([ source, source ]).serve();

				task.once( 'ready', function () {
					task.once( 'built', function () {
						request( 'http://localhost:4567/bar.md' ).then( function ( body ) {
							try {
								assert.equal( body.trim(), 'bar: this is some text' );
							} catch ( e ) {
								done( e );
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

		it( 'should print correct stack traces when errors occur', function ( done ) {
			var source = gobble( 'tmp/foo' );

			task = source.transform( function ( input ) {
				throw new Error( 'FAIL' );
			}).serve();

			task.on( 'error', function ( err ) {
				assert.equal( err.code, 'TRANSFORMATION_FAILED' );
				assert.equal( err.original.message, 'FAIL' );
				assert.ok( !!err.stack );
				assert.ok( ~err.stack.indexOf( 'scenarios.js' ) );
				done();
			});
		});

		it( 'should delete unwanted options from map transformers', function ( done ) {
			var source = gobble( 'tmp/foo' );

			task = source.transform( checkOptions ).serve();

			function checkOptions ( code, options ) {
				assert.ok( !options.accept );
				assert.ok( !options.ext );

				return code;
			}

			checkOptions.defaults = {
				accept: '.md',
				ext: '.txt'
			};

			task.on( 'built', function () {
				done();
			});
		});

		it( 'should merge directories with the same name', function ( done ) {
			task = gobble([ 'tmp/bar/a', 'tmp/bar/b' ]).serve();

			task.on( 'built', function () {
				request( 'http://localhost:4567/dir/a.md' ).then( function ( body ) {
					assert.equal( body, 'this is a.md' );

					request( 'http://localhost:4567/dir/b.md' ).then( function ( body ) {
						assert.equal( body, 'this is b.md' );
						done();
					});
				});
			});
		});

		it( 'handles invalidations that take place during file transformations (#41)', function ( done ) {
			var source = gobble( 'tmp/foo' );
			var shouldInvalidate = false;

			function cacheBust ( input ) {
				return '' + Math.random();
			}

			function maybeInvalidate ( input ) {
				if ( shouldInvalidate ) {
					simulateChange( source, {
						type: 'change',
						path: 'tmp/foo/foo.md'
					});
					shouldInvalidate = false;
				}

				return Math.random();
			}

			task = source.transform( cacheBust ).transform( maybeInvalidate ).serve();

			task.once( 'built', function () {
				task.once( 'built', function () {
					done();
				});

				shouldInvalidate = true;

				simulateChange( source, {
					type: 'change',
					path: 'tmp/foo/foo.md'
				});
			});

			task.on( 'error', done );
		});

		it( 'triggers observers on file changes', function ( done ) {
			var observed = 0;

			var source = gobble( 'tmp/foo' );

			task = source.observe( function ( inputdir, options, done ) {
				observed += 1;
				done();
			}).watch({
				dest: 'tmp/output'
			});

			task.once( 'built', function () {
				assert.equal( observed, 1 );

				task.once( 'built', function () {
					assert.equal( observed, 2 );
					done();
				});

				simulateChange( source, {
					type: 'change',
					path: 'tmp/foo/foo.md'
				});
			});
		});

		it( 'errors on .grab(path1, path2) or .moveTo(path1, path2)', function () {
			try {
				var source = gobble( 'tmp/foo' ).grab( 'a', 'b' );
				assert.ok( false );
			} catch ( err ) {
				assert.ok( /cannot pass multiple strings/.test( err.message ) );
			}

			try {
				var source = gobble( 'tmp/foo' ).moveTo( 'a', 'b' );
				assert.ok( false );
			} catch ( err ) {
				assert.ok( /cannot pass multiple strings/.test( err.message ) );
			}
		});

		it( 'errors if you try to pass multiple nodes to gobble()', function () {
			try {
				var source = gobble( 'tmp/foo', 'tmp/bar' );
				assert.ok( false );
			} catch ( err ) {
				assert.ok( /could not process input/.test( err.message ) );
			}
		});

		it( 'errors if an input array member is invalid', function () {
			try {
				var source = gobble([ 42 ]);
				assert.ok( false );
			} catch ( err ) {
				assert.ok( /could not process input/.test( err.message ) );
			}
		});
	});
};
