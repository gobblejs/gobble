var yabl = function ( inputs ) {
	if ( Object.prototype.toString.call( inputs ) !== '[object Array]' ) {
		inputs = [ inputs ];
	}

	inputs = inputs.map( function ( input ) {
		if ( typeof input === 'string' ) {
			return new yabl.Source( input );
		}

		return input;
	});

	if ( inputs.length === 1 ) {
		return inputs[0];
	}

	return new yabl.Merger( inputs );
};

yabl.helpers = require( './helpers' );
yabl.serve = require( './serve' );
yabl.cwd = require( './cwd' );

yabl.Source  = require( './Source' );
yabl.Merger  = require( './Merger' );
yabl.Node    = require( './Node' );

module.exports = yabl;
