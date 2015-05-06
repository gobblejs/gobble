import { symlinkOrCopy } from 'sander';

export default function moveTo ( inputdir, outputdir, options ) {
	return symlinkOrCopy( inputdir ).to( outputdir, options.dest );
}
