export default function makeLog ( node, event = 'info' ) {
	return function log ( details ) {
		// it's a string that may be formatted
		if ( typeof details === 'string' ) {
			node.emit( event, { progressIndicator: true, message: details, parameters: Array.prototype.slice.call( arguments, 1 ) } );
		} else { // otherwise, pass through
			node.emit( event, details );
		}
	};
}
