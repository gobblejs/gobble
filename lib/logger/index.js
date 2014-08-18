var config = require( '../config' ),
	write = require( '../file/write' ),
	messages = '',
	logger;

require( 'colors' );

logger = {
	info: function ( message, data ) {
		log( 'INFO', 'GOBBLE INFO   '.cyan, message, data );
	},

	warn: function ( message, data ) {
		log( 'WARNING', 'GOBBLE WARNING'.orange, message, data );
	},

	error: function ( message, data ) {
		log( 'ERROR', 'GOBBLE ERROR  '.red, message, data );
	},

	save: function ( message ) {
		messages += message + '\n';
		write( config.gobbledir, 'gobble.log', messages );
	}
}

function log ( logPrefix, consolePrefix, message, data ) {
	message = interpolate( message, data || {} );

	logger.save( ( '> ' + logPrefix + ' ' + message ).replace( /\[\d+m/g, '' ) ); // remove colors
	console.log( consolePrefix + ' ' + message );
}

function interpolate ( message, data ) {
	return message.replace( /\{([^\}]+)\}/g, function ( match, $1 ) {
		return data[ $1 ] || match;
	});
}

module.exports = logger;
