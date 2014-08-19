var getNode = require( './utils/getNode' );

var sources = {};

var gobble = function ( inputs, options ) {
	return getNode( inputs, options );
};

gobble.file = require( './file' );
gobble.serve = require( './serve' );
gobble.build = require( './build' );

module.exports = gobble;
