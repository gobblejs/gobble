var file = require( '../file' ),
	Promise = require( 'promo' ).Promise;

module.exports = function cleanup ( dir ) {
	return file.mkdirp( dir ).then( function () {
		return file.readdir( dir ).then( function ( files ) {
			var promises = files.map( function ( filename ) {
				return file.rimraf( dir, filename );
			});

			return Promise.all( promises );
		});
	});
};
