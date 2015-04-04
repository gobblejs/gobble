function GobbleError ( data ) {
	var prop;

	this.stack = (new Error()).stack;

	for ( prop in data ) {
		if ( data.hasOwnProperty( prop ) ) {
			this[ prop ] = data[ prop ];
		}
	}
}

GobbleError.prototype = Object.create( Error.prototype );
GobbleError.prototype.constructor = GobbleError;
GobbleError.prototype.gobble = true;
GobbleError.prototype.name = 'GobbleError';

export default GobbleError;
