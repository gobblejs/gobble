module.exports = function ( err ) {
	setTimeout( function () {
		console.trace( 'error', err );
		//throw err;
	});
};
