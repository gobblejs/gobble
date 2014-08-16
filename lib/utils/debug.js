module.exports = function ( err ) {
	setTimeout( function () {
		console.log( 'GOBBLE ERROR: ' + ( err ? err.message || err : 'unknown' ) + '\n' );
	});
};
