import { dirname } from 'path';
import { mkdirSync } from 'sander';
import { sync as symlinkOrCopy } from 'symlink-or-copy';

// TODO this it out of keeping with other APIs and should probably
// be removed...

export default function ( srcPath, destPath ) {
	mkdirSync( dirname( srcPath ) );
	mkdirSync( dirname( destPath ) );

	symlinkOrCopy( srcPath, destPath );
}
