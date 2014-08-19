var path = require( 'path' ),
	stat = require( './stat' );

module.exports = function () {
	return stat( path.resolve.apply( path, arguments ) ).then( function () {
		return true;
	}, function () {
		return false;
	});
};
