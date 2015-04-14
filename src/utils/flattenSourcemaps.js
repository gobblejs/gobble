import { resolve } from 'path';
import { lsr, Promise } from 'sander';
import { load } from 'sorcery';

export default function flattenSourcemaps ( inputdir, node ) {
	return lsr( inputdir ).then( files => {
		const promises = files
			.filter( file => file.slice( -4 ) !== '.map' )
			.map( file => {
				return load( resolve( inputdir, file ), {
					sourcemaps: node.getSourcemaps()
				}).then( chain => {
					if ( chain ) {
						// overwrite in place
						return chain.write();
					}
				});
			});

		return Promise.all( promises );
	})
	.then( () => inputdir );
}