var stat = require( './stat' );

module.exports = function ( file ) {
	return stat( file ).then( function () {
		return true;
	}, function () {
		return false;
	});
};
