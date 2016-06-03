var assert = require( 'assert' );
var sander = require( 'sander' );
var gobble = require( '..' );

function read (path) {
	return sander.readFileSync( path, { encoding: 'utf-8' }).trim();
}

module.exports = function () {
	describe.only( 'node.observe()', function () {
		beforeEach( function () {
			return Promise.all([
				sander.rimraf( '.gobble-build' ),
				sander.rimraf( 'tmp' )
			]).then( function () {
				return sander.copydir( 'sample' ).to( 'tmp' );
			});
		});

		it( 'calls observers on initial build', function () {
			var observed = 0;

			return gobble( 'tmp/foo' ).observe( function ( inputdir, options, done ) {
				observed += 1;
				done();
			}).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.equal( observed, 1 );
			});
		});

		it( 'prevents build completing if observers error', function () {
			var error = new Error( 'oh noes!' );

			return gobble( 'tmp/foo' ).observe( function () {
				throw error;
			}).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.fail();
			}).catch( function ( err ) {
				if ( err.original !== error ) {
					throw err;
				}
			});
		});

		it( 'prevents build completing if observers fail asynchronously via callback', function () {
			var error = new Error( 'oh noes!' );

			return gobble( 'tmp/foo' ).observe( function ( inputdir, options, done ) {
				setTimeout( function () {
					done( error );
				});
			}).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.fail();
			}).catch( function ( err ) {
				if ( err.original !== error ) {
					throw err;
				}
			});
		});

		it( 'prevents build completing if observers fail asynchronously via promise', function () {
			var error = new Error( 'oh noes!' );

			return gobble( 'tmp/foo' ).observe( function () {
				return Promise.reject( error );
			}).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.fail();
			}).catch( function ( err ) {
				if ( err.original !== error ) {
					throw err;
				}
			});
		});

		it( 'doesn\'t skip an observer if condition is false', function () {
			var observed = 0;

			return gobble( 'tmp/foo' ).observeIf( true, function ( inputdir, options, done ) {
				observed += 1;
				done();
			}).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.equal( observed, 1 );
			});
		});

		it( 'skips an observer if condition is false', function () {
			var observed = 0;

			return gobble( 'tmp/foo' ).observeIf( false, function ( inputdir, options, done ) {
				observed += 1;
				done();
			}).build({
				dest: 'tmp/output'
			}).then( function () {
				assert.equal( observed, 0 );
			});
		});
	});
};
