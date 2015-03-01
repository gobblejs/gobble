import { resolve, dirname } from 'path';
import { mkdir } from 'sander';
import { sync as symlinkOrCopy } from 'symlink-or-copy';

export default function () {
	var src = resolve.apply( null, arguments );

	return {
		to: function () {
			var dest = resolve.apply( null, arguments );

			return mkdir( dirname( dest ) ).then( function () {
				symlinkOrCopy( src, dest );
			});
		}
	};
}
