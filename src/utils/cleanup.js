import { mkdir, readdir, rimraf, Promise } from 'sander' ;

export default function cleanup ( dir ) {
	return mkdir( dir ).then( function () {
		return readdir( dir ).then( function ( files ) {
			var promises = files.map( function ( filename ) {
				return rimraf( dir, filename );
			});

			return Promise.all( promises );
		});
	});
}
