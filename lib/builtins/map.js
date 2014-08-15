var Promise = require( 'promo' ).Promise,
	helpers = require( '../helpers' );

module.exports = function map ( srcDir, destDir, options, done ) {
	helpers.ls( srcDir ).then( function ( files ) {
		var promises = files.map( function ( file ) {
			return helpers.stat( srcDir, file ).then( function ( stats ) {
				if ( stats.isDirectory() ) {
					return;
				}

				return helpers.read( srcDir, file ).then( function ( data ) {
					var result = options.fn( data.toString(), options.options );
					return helpers.write( destDir, file, result );
				});
			});
		});

		return Promise.all( promises ).then( function () {
			done();
		}, done );
	});
};
