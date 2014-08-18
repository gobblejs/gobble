var Source = require( './Source' ),
	Merger = require( './Merger' );

var sources = {};

var gobble = function ( inputs, options ) {
	if ( Object.prototype.toString.call( inputs ) !== '[object Array]' ) {
		inputs = [ inputs ];
	}

	inputs = inputs.map( function ( input ) {
		if ( typeof input === 'string' ) {
			return sources[ input ] || ( sources[ input ] = new Source( input, options ) );
		}

		return input;
	});

	if ( inputs.length === 1 ) {
		return inputs[0];
	}

	return new Merger( inputs, options );
};

gobble.file = require( './file' );
gobble.serve = require( './serve' );

module.exports = gobble;
