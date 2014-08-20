module.exports = function ( command, gobble, cwd, gobblefile, gobbledir ) {
	var path = require( 'path' ),
		targetDir;

	require( 'colors' );

	targetDir = command.args[1];
	if ( !targetDir ) {
		console.log( 'You must specify an output folder, e.g. ' + 'gobble build dist'.magenta );
		process.exit( 1 );
	}

	gobble.build( require( gobblefile ), {
		target: path.resolve( cwd, targetDir ),
		gobbledir: gobbledir,
		force: command.options.force
	});
};
