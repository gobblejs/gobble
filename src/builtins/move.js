import merge from '../file/merge';

export default function moveTo ( inputdir, outputdir, options ) {
	return merge( inputdir ).to( outputdir, options.dest );
}
