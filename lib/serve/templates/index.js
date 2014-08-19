module.exports = {
	dir: make( 'dir.html' ),
	err: make( 'err.html' ),
	notfound: make( 'notfound.html' ),
	waiting: make( 'waiting.html' )
};

function make( filename ) {
	var promise, read = require( '../../file/read' );

	return function () {
		if ( !promise ) {
			promise = read( __dirname, filename ).then( function ( result ) {
				var template = result.toString();

				return function ( data ) {
					return template.replace( /\$\{([^\}]+)\}/g, function ( match, $1 ) {
						return data[ $1 ] || match;
					});
				};
			});
		}

		return promise;
	};
}
