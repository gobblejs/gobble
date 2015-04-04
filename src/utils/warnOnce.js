/*global console */
import { format } from 'util';

let alreadyWarned = {};

export default function warnOnce () {
	const warning = format.apply( null, arguments );

	if ( !alreadyWarned[ warning ] ) {
		console.log( warning );
		alreadyWarned[ warning ] = true;
	}
}
