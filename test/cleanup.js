var assert = require( 'assert' );
var path = require( 'path' );
var request = require( 'request-promise' );
var gobble = require( '../lib' ).default;
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

	describe( 'cleanup', function () {
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
	});
};
