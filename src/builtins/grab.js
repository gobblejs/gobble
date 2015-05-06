import { symlinkOrCopy } from 'sander';

export default function grab ( inputdir, outputdir, options ) {
	return symlinkOrCopy( inputdir, options.src ).to( outputdir );
}
