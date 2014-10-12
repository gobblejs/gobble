var getNode = require( './utils/getNode' );

var gobble = function ( inputs, options ) {
	return getNode( inputs, options );
};

gobble.env = function () {
	return process.env.GOBBLE_ENV || 'development';
};

module.exports = gobble;
