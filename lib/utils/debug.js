module.exports = function ( err ) {
	setTimeout( function () {
		console.trace( 'GOBBLE ERROR: ' + ( err ? err.message || err : 'unknown' ) + '\n' );
	});
};
