var assert = require( 'assert' );
var path = require( 'path' );
var request = require( 'request' );
var gobble = require( '../tmp' ).default;
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

		it( 'should use absolute URLs for automatically created sourceMappingURL comments', function ( done ) {
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
				request( 'http://localhost:4567/dir/a.md', function ( err, response, body ) {
					assert.equal( body, 'this is a.md' );

					request( 'http://localhost:4567/dir/b.md', function ( err, response, body ) {
						assert.equal( body, 'this is b.md' );
						done();
					});
				});
			});
		});

		it( 'should deconflict automatically generated sourcemaps (#38)', function ( done ) {
			task = gobble( 'tmp/foo' ).transform( copy ).transform( copy ).serve();

			function copy ( input ) {
				return {
					code: input,
					map: {}
				};
			}

			task.on( 'error', done );
			task.on( 'built', function () {
				request( 'http://localhost:4567/foo.md', function ( err, response, body ) {
					assert.ok( /^foo: this is some text/.test( body ) );
					done();
				});
			});
		});

		it( 'populates auto-generated sourcemaps with the correct sourcesContent', function ( done ) {
			task = gobble( 'tmp/foo' ).transform( copy ).serve();

			function copy ( input ) {
				return {
					code: input.toUpperCase(),
					map: {}
				};
			}

			task.on( 'error', done );
			task.on( 'built', function () {
				request( 'http://localhost:4567/foo.md', function ( err, response, body ) {
					var sourceMappingURL = /sourceMappingURL=(.+)/.exec( body )[1];
					sander.readFile( sourceMappingURL ).then( String ).then( JSON.parse ).then( function ( map ) {
						assert.deepEqual( map.sourcesContent, [ sander.readFileSync( 'tmp/foo/foo.md' ).toString() ] );
						done();
					}).catch( done );
				});
			});
		});

		it( 'fixes inline sourcemaps (#45)', function () {
			var source = gobble( 'tmp/foo' );

			return source.transform( function ( input ) {
				return input + '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,e30='; // e30= is {}
			}).build({
				dest: 'tmp/output'
			}).then( function () {
				return sander.readFile( 'tmp/output/foo.md' )
					.then( String )
					.then( function ( body ) {
						var sourceMappingURL = /sourceMappingURL=(.+)/.exec( body )[1];
						var base64 = /base64,(.+)/.exec( sourceMappingURL )[1];
						var json = new Buffer( base64, 'base64' ).toString();
						var map = JSON.parse( json );

						assert.ok( /foo\.md$/.test( map.file ) );
						assert.deepEqual( map.sources, [ path.resolve( 'tmp/foo/foo.md' ) ] );
						assert.deepEqual( map.sourcesContent, [ sander.readFileSync( 'tmp/foo/foo.md' ).toString() ] );
					});
			});
		});

		it( 'should not make a file transform without a sourcemap sprout an invalid one', function ( done ) {
			sander.writeFileSync( 'tmp/dynamic/baz', 'step1' );
			var source = gobble( 'tmp/dynamic' );

			function toTxt ( input ) {
				return input;
			}

			task = source.transform( toTxt ).watch({ dest: 'tmp/output' });

			task.once( 'built', function () {
				task.once( 'built', function () {
					var content = sander.readFileSync( 'tmp/output/baz' );
					assert.equal( content, 'step2' );
					done();
				});

				sander.writeFileSync( 'tmp/dynamic/baz', 'step2' );

				simulateChange( source, {
					type: 'change',
					path: 'tmp/dynamic/baz'
				});
			});

			task.on( 'error', function ( err ) {
				setTimeout( function () {
					throw err;
				});
			});
		});

		it( 'should use the specified encoding when reading files', function () {
			var source = gobble( 'tmp/foo' ), count = 0, foundBar = false;

			function plugin ( input, options ) {
				count++;

				if(this.filename === 'bar.md') {
					foundBar = true;

					assert.equal(
						new Buffer( input, 'base64' ).toString('utf8').trim(),
						'bar: this is some text'
					);
				}

				return input.toString( 'base64' );
			}
			plugin.defaults = {sourceEncoding: 'base64'};

			task = source.transform( plugin ).build({
				dest: 'tmp/output'
			});

			return task.then( function () {
				assert.equal( count, 3 );
				assert( foundBar );
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
	});


};
