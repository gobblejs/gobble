export default function compile ( string ) {
	return data => {
		return string.replace( /\{\{([^\}]+)\}\}/g, ( match, $1 ) => {
			return data.hasOwnProperty( $1 ) ? data[ $1 ] : match;
		});
	};
}
