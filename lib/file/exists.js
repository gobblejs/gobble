var stat = require( './stat' );

module.exports = function ( filename ) {
	return stat( filename ).then( function () {
		return true;
	}, function () {
		return false;
	});
};
