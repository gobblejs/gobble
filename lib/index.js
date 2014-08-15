var sources = {};

var gobble = function ( inputs ) {
	if ( Object.prototype.toString.call( inputs ) !== '[object Array]' ) {
		inputs = [ inputs ];
	}

	inputs = inputs.map( function ( input ) {
		if ( typeof input === 'string' ) {
			return sources[ input ] || ( sources[ input ] = new gobble.Source( input ) );
		}

		return input;
	});

	if ( inputs.length === 1 ) {
		return inputs[0];
	}

	return new gobble.Merger( inputs );
};

gobble.helpers = require( './helpers' );
gobble.serve = require( './serve' );
gobble.cwd = require( './cwd' );

gobble.Source  = require( './Source' );
gobble.Merger  = require( './Merger' );
gobble.Node    = require( './Node' );

module.exports = gobble;
