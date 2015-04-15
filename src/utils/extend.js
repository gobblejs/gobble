export default function extend ( target, ...sources ) {
	sources.forEach( source => {
		if ( !source ) return;

		Object.keys( source ).forEach( key => {
			target[ key ] = source[ key ];
		});
	});

	return target;
}