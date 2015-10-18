require( 'source-map-support' ).install();
// This is to globally patch the fs module
// before anything else requires it
var gfs = require( 'graceful-fs' );
gfs.gracefulify(require( 'fs' ));

module.exports = require( './dist/gobble' );
