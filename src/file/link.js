import { resolve, dirname } from 'path';
import { mkdir } from 'sander';
import { sync as symlinkOrCopy } from 'symlink-or-copy';

export default function () {
	const src = resolve.apply( null, arguments );

	return {
		to () {
			const dest = resolve.apply( null, arguments );

			return mkdir( dirname( dest ) ).then( () =>	symlinkOrCopy( src, dest ) );
		}
	};
}
