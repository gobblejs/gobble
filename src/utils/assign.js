export default function assign ( target, ...sources ) {
	sources.forEach( function ( source ) {
		var key;

		for ( key in source ) {
			if ( source.hasOwnProperty( key ) ) {
				target[ key ] = source[ key ];
			}
		}
	});

	return target;
}
