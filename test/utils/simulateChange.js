var path = require( 'path' );

module.exports = function simulateChange ( source, change ) {
	source.emit( 'error', {
		name: 'GobbleError',
		code: 'INVALIDATED',
		message: 'build invalidated',
		changes: [{
			type: change.type,
			path: path.resolve( change.path )
		}]
	});
};