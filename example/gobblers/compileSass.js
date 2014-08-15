module.exports = function compileSass ( srcDir, destDir, options, done ) {
	require( 'node-sass' ).render({
		file: require( 'path' ).join( srcDir, options.src ),
		success: function ( css ) {
			require( 'gobble' ).helpers.write( destDir, options.dest, css ).then( done );
		}
	});
};
