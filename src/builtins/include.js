import { dirname } from 'path';
import { lsr, mkdir, symlinkOrCopy, Promise } from 'sander';
import *  as minimatch from 'minimatch';

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
					return symlinkOrCopy( inputdir, file ).to( outputdir, file );
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
