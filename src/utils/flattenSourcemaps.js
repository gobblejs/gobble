import { extname, resolve } from 'path';
import { lsr } from 'sander';
import * as mapSeries from 'promise-map-series';
import { load } from 'sorcery';

const whitelist = { '.js': true, '.css': true };

export default function flattenSourcemaps ( inputdir, outputdir, base, node, task ) {
	return lsr( inputdir ).then( files => {
		const jsAndCss = files.filter( file => whitelist[ extname( file ) ] );
		const sourcemaps = node.getSourcemaps();

		return mapSeries( jsAndCss, file => {
			return load( resolve( inputdir, file ), { sourcemaps })
				.then( chain => {
					if ( chain ) {
						return chain.write( resolve( outputdir, file ), { base });
					}
				})
				.catch( err => {
					task.emit( 'error', err );
				});
			});
	})
	.then( () => inputdir );
}