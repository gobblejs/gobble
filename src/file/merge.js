import { resolve, sep } from 'path';
import {
	lstat,
	mkdirSync,
	readdir,
	readdirSync,
	realpathSync,
	stat,
	symlinkSync,
	unlink,
	unlinkSync,
	Promise
} from 'sander';
import symlink from './symlink';

export default function () {
	const src = resolve.apply( null, arguments );

	return {
		to () {
			const dest = resolve.apply( null, arguments );

			return _merge( src, dest );
		}
	};
}

function _merge ( src, dest ) {
	return stat( dest ).then( stats => {
		if ( stats.isDirectory() ) {
			// If it's a symlinked dir, we need to convert it to a real dir.
			// Suppose linked-foo/ is a symlink of foo/, and we try to copy
			// the contents of bar/ into linked-foo/ - those files will end
			// up in foo, which is definitely not what we want
			return lstat( dest ).then( stats => {
				if ( stats.isSymbolicLink() ) {
					convertToRealDir( dest );
				}

				return readdir( src ).then( files => {
					const promises = files.map( filename =>
						_merge( src + sep + filename, dest + sep + filename )
					);

					return Promise.all( promises );
				});
			});
		}

		// exists, and is file - overwrite
		return unlink( dest ).then( link );
	}, link ); // <- failed to stat, means dest doesn't exist

	function link () {
		symlink( src, dest );
	}
}

function convertToRealDir ( symlinkPath ) {
	const originalPath = realpathSync( symlinkPath );

	unlinkSync( symlinkPath );
	mkdirSync( symlinkPath );

	readdirSync( originalPath ).forEach( filename => {
		symlinkSync( originalPath + sep + filename ).to( symlinkPath + sep + filename );
	});
}
