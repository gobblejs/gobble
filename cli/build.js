module.exports = function ( command ) {
	var path = require( 'path' ),
		gobble = require( '../lib' ),
		cleanup = require( './utils/cleanup' ),
		config = require( '../lib/config' ),
		logger = require( '../lib/logger' ),
		targetDir,
		resolvedTarget;

	targetDir = command.args[1];
	if ( !targetDir ) {
		throw new Error( 'You must specify an output folder, e.g. gobble build dist' );
	}

	resolvedTarget = path.join( config.cwd, targetDir );

	cleanup( config.gobbledir ).then( function () {
		// Check that nothing exists in the target folder
		if ( command.options.force ) {
			return cleanup( resolvedTarget ).then( build );
		} else {
			return gobble.file.readdir( resolvedTarget ).then( function ( files ) {
				if ( files.length ) {
					logger.error( 'target folder \'{target}\' is not empty! Use --force (or -f) to continue anyway', { target: config.gobbledir });
					return;
				}

				return build();
			}, build );
		}
	}).catch( logger.error );

	function build () {
		logger.info( 'building...' );

		return gobble( require( config.gobblefile ) ).ready().then( function ( outputDir ) {
			gobble.file.copydir( outputDir, path.join( config.cwd, targetDir ) ).then( function () {
				logger.info( 'Successfully built project to {target}', { target: targetDir });
			});
		});
	}
};
