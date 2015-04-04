export default function assign ( target, ...sources ) {
	sources.forEach( source => {
		let key;

		for ( key in source ) {
			if ( source.hasOwnProperty( key ) ) {
				target[ key ] = source[ key ];
			}
		}
	});

	return target;
}
