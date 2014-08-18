var file = require( '../../lib/file' ),
	Promise = require( 'promo' ).Promise;

module.exports = function cleanup ( gobbledir ) {
	return file.mkdirp( gobbledir ).then( function () {
		return file.readdir( gobbledir ).then( function ( files ) {
			var promises = files.map( function ( filename ) {
				return file.rimraf( gobbledir, filename );
			});

			return Promise.all( promises );
		});
	});
};
