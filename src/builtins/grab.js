import merge from '../file/merge';

export default function grab ( inputdir, outputdir, options ) {
	return merge( inputdir, options.src ).to( outputdir );
}
