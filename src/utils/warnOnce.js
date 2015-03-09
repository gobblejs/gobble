/*global console */
import { format } from 'util';

var alreadyWarned = {};

export default function warnOnce () {
	var warning = format.apply( null, arguments );

	if ( !alreadyWarned[ warning ] ) {
		console.log( warning );
		alreadyWarned[ warning ] = true;
	}
}
