var yabl = function ( inputs ) {
	if ( Object.prototype.toString.call( inputs ) !== 'string' ) {
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

	return new yabl.Node( inputs );
};

yabl.helpers = require( './helpers' );
yabl.serve = require( './serve' );
yabl.cwd = require( './cwd' );

yabl.Source  = require( './Source' );
yabl.Node    = require( './Node' );

module.exports = yabl;
