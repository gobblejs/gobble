var path = require( 'path' );

module.exports = function simulateChange ( source, change ) {
	source.emit( 'invalidate', {
		changes: [{
			type: change.type,
			path: path.resolve( change.path )
		}]
	});
};