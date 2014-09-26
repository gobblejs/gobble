var getNode = require( './utils/getNode' );

var gobble = function ( inputs, options ) {
	return getNode( inputs, options );
};

gobble.env = require( './config/env' );

module.exports = gobble;
