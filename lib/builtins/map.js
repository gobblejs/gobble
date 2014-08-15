var Promise = require( 'promo' ).Promise,
	file = require( '../file' );

module.exports = function map ( srcDir, destDir, options, done ) {
	file.ls( srcDir ).then( function ( files ) {
		var promises = files.map( function ( filename ) {
			return file.stat( srcDir, filename ).then( function ( stats ) {
				if ( stats.isDirectory() ) {
					return;
				}

				return file.read( srcDir, filename ).then( function ( data ) {
					var result = options.fn( data.toString(), options.options );
					return file.write( destDir, filename, result );
				});
			});
		});

		return Promise.all( promises ).then( function () {
			done();
		}, done );
	});
};
