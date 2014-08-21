module.exports = function ( tree, options ) {
	var readdir = require( '../file/readdir' ),
		copydir = require( '../file/copydir' ),
		cleanup = require( '../utils/cleanup' ),
		getNode = require( '../utils/getNode' ),
		logger = require( '../logger' );

	tree = getNode( tree );

	if ( !options.target ) {
		logger.error( 'You must specify an output folder, e.g. ' + 'gobble.build({ target: \'dist\' })'.cyan );
		process.exit( 1 );
	}

	cleanup( options.gobbledir ).then( function () {
		// Check that nothing exists in the target folder
		if ( options.force ) {
			return cleanup( options.target ).then( build );
		} else {
			return readdir( options.target ).then( function ( files ) {
				if ( files.length ) {
					logger.error( 'target folder \'{target}\' is not empty! Use --force (or -f) to continue anyway', { target: options.gobbledir });
					return;
				}

				return build();
			}, build );
		}
	}).catch( logger.error );

	function build () {
		logger.info( 'building...' );

		return tree.ready().then( function ( outputDir ) {
			return copydir( outputDir ).to( options.target ).then( function () {
				logger.info( 'Successfully built project to \'{target}\'', { target: options.target });
			});
		});
	}
};
