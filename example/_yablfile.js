var yabl = require( 'yabl' );

var styles = yabl( 'src/scss/**/*.scss' )
	.transform( compileSass, { src: 'src/scss/main.scss', dest: 'min.css' });



function compileSass ( srcDir, destDir, options, done ) {
	var sass = require( 'node-sass' );

	sass.render({
		file: path.join( srcDir, options.src ),
		success: function ( css ) {
			console.log( 'css', css );
			yabl.helpers.write( destDir, options.dest, css ).then( done );
		}
	});
}
