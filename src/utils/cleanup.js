import { mkdir, readdir, rimraf, Promise } from 'sander' ;

export default function cleanup ( dir ) {
	return mkdir( dir ).then( () => {
		return readdir( dir ).then( files => {
			var promises = files.map( filename => rimraf( dir, filename ) );
			return Promise.all( promises );
		})
	});
}
