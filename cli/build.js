module.exports = function ( command ) {
	var path = require( 'path' ),
		config = require( '../lib/config' ),
		build = require( '../lib/build' ),
		logger = require( '../lib/logger' ),
		targetDir;

	targetDir = command.args[1];
	if ( !targetDir ) {
		logger.error( 'You must specify an output folder, e.g. gobble build dist' );
		process.exit( 1 );
	}

	build( require( config.gobblefile ), {
		target: path.resolve( config.cwd, targetDir ),
		gobbledir: config.gobbledir,
		force: command.options.force
	});
};
