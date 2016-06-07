import { format } from 'util';

let alreadyWarned = {};

export default function warnOnce () {
	const warning = format.apply( null, arguments );

	if ( !alreadyWarned[ warning ] ) {
		console.log( warning ); // eslint-disable-line no-console
		alreadyWarned[ warning ] = true;
	}
}
