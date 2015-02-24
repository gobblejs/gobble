var assert = require( 'assert' );
var path = require( 'path' );
var request = require( 'request' );
var gobble = require( '../' );
var sander = require( 'sander' );
var simulateChange = require( './utils/simulateChange' );

gobble.cwd( __dirname );

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

		it( 'should pass copy of default options to file transformers', function () {
			var source = gobble( 'tmp/foo' ), count = 0;

			function checkOptions ( input, options ) {
				assert.equal( options.foo, 'bar' );
				options.foo = 'baz';
				count++;

				return input;
			}

			checkOptions.defaults = { foo: 'bar' };

			task = source.transform( checkOptions ).build({
				dest: 'tmp/output'
			});

			return task.then( function () {
				assert.equal( count, 3 );
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

		it( 'should allow file transforms to filter with a RegExp', function () {
			var count = 0, source = gobble( 'tmp/foo' ), task;

			function checkFilter( input ) {
				count++;
				return input;
			}
			checkFilter.defaults = {
				accept: /foo\.md/
			};

			task = source.transform( checkFilter ).build({
				dest: 'tmp/output'
			});

			return task.then( function () {
				assert.equal( count, 1 );
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
						request( 'http://localhost:4567/bar.md', function ( err, response, body ) {
							try {
								assert.equal( response.statusCode, 200 );
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

		it( 'should populate use absolute URLs for automatically created sourceMappingURL comments', function ( done ) {
			var source = gobble( 'tmp/foo' );

			task = source.transform( function ( input ) {
				return {
					code: input,
					map: {}
				};
			}).serve();

			task.once( 'ready', function () {
				task.once( 'built', function () {
					request( 'http://localhost:4567/foo.md', function ( err, response, body ) {
						var sourceMappingURL = /sourceMappingURL=(.+)/.exec( body )[1];
						assert.ok( /^(?:[A-Z]:)?[\/\\]/i.test( sourceMappingURL ) );
						assert.ok( sander.existsSync( sourceMappingURL ), 'sourcemap file does not exist' );
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
	});


};
