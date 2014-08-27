var GobbleError = function ( data ) {
	var prop;

	for ( prop in data ) {
		if ( data.hasOwnProperty( prop ) ) {
			this[ prop ] = data[ prop ];
		}
	}
};

GobbleError.prototype = Object.create( Error );
GobbleError.prototype.constructor = GobbleError;
GobbleError.prototype.name = 'GobbleError';

module.exports = GobbleError;
