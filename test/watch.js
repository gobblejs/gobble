var assert = require( 'assert' ),
	path = require( 'path' ),
	sander = require( 'sander' ),

	sample = new RegExp( '^' + path.join( __dirname, 'sample' ) ),
	output = path.join( __dirname, 'output' ),
	simulateChange = require( './utils/simulateChange' );

module.exports = function () {
	describe( 'node.watch()', function () {
		beforeEach( function () {
			return sander.Promise.all([
				sander.rimraf( 'output' ),
				sander.copydir( 'sample' ).to( 'input' )
			]);
		});

		afterEach( function () {
			// Clear cache of sample build definitions
			Object.keys( require.cache ).forEach( function ( mod ) {
				if ( sample.test( mod ) ) {
					delete require.cache[ mod ];
				}
			});

			return sander.Promise.all([
				sander.rimraf( 'output' ),
				sander.rimraf( 'input' )
			]);
		});

		it( 'should error if no dest specified', function () {
			assert.throws( function () {
				var task = require( './input/foo' ).watch();
			}, function ( err ) {
				return err.code === 'MISSING_DEST_DIR';
			});
		});

		it( 'should write build to the specified directory', function ( done ) {
			var task = require( './input/foo' ).watch({
				dest: output
			});

			task.once( 'built', function () {
				sander.readFile( 'output', 'foo.md' )
					.then( String )
					.then( function ( body ) {
						assert.equal( body.trim(), 'foo: this is some text' );
						task.close().then( done );
					})
					.catch( done );
			});

			task.on( 'error', done );
		});

		it( 'should update files on change', function ( done ) {
			var source, task;

			source = require( './input/foo' );
			task = source.watch({
				dest: output
			});

			task.once( 'built', function () {
				task.once( 'built', function () {
					sander.readFile( 'output/foo.md' ).then( String ).then( function ( body ) {
						assert.equal( body.trim(), 'IT CHANGED!' );
						task.close().then( done );
					});
				});

				sander.writeFile( 'input/foo/foo.md', 'IT CHANGED!' ).then( function () {
					simulateChange( source, {
						type: 'change',
						path: 'input/foo/foo.md'
					});
				});
			});
		});
	});
};
