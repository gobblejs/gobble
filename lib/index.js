var getNode = require( './utils/getNode' );

var gobble = function ( inputs, options ) {
	return getNode( inputs, options );
};

// hijack prototypes...
String.prototype.build = Array.prototype.build = function ( options ) {
	return getNode( this ).build( options );
};

gobble.env = require( './config/env' );

module.exports = gobble;
