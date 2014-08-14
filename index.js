var yabl = require( './lib' );

module.exports = function ( inputs ) {
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
