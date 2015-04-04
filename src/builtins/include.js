import { dirname, sep } from 'path';
import { lsr, mkdir, Promise } from 'sander';
import *  as minimatch from 'minimatch';
import { sync as symlinkOrCopy } from 'symlink-or-copy';

export default function include ( inputdir, outputdir, options ) {
	const numPatterns = options.patterns.length;

	return lsr( inputdir )
		.then( files => {
			return files.filter( file => {
				const isIncluded = matches( file );
				return options.exclude ? !isIncluded : isIncluded;
			});
		})
		.then( files => {
			const promises = files.map( file => {
				return mkdir( outputdir, dirname( file ) ).then( () => {
					const src = inputdir + sep + file;
					const dest = outputdir + sep + file;

					// TODO sander-esque symlinkOrCopy
					symlinkOrCopy( src, dest );
				});
			});

			return Promise.all( promises );
		});

	function matches ( filename ) {
		let i = numPatterns;
		while ( i-- ) {
			if ( minimatch( filename, options.patterns[i] ) ) {
				return true;
			}
		}

		return false;
	}
}
