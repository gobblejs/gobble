var assert = require( 'assert' ),
	request = require( 'request' ),
	gobble = require( '../' ),
	path = require( 'path' ),
	r = path.resolve.bind( null, __dirname ),
	sample = new RegExp( '^' + path.join( __dirname, 'sample' ) );

module.exports = function () {
	var task;

	afterEach( function ( done ) {
		try {
			task.close().then( done );
		} catch ( err ) {

		} finally {
			task = null;
			done();
		}
	});

	it( 'should bug out on non-existent directories (#12)', function () {
		assert.throws( function () {
			gobble( r( 'sample/nope' ) ).serve();
		}, /nope directory does not exist/ );
	});
};
