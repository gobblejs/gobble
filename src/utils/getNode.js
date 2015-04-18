import { resolve } from 'path';
import { Merger, Source } from '../nodes';
import config from '../config';
import { isArray, isString } from './is';

let sources = {};

export default getNode;

function getNode ( input, options ) {
	if ( input._gobble ) {
		return input;
	}

	if ( isArray( input ) ) {
		input = input.map( ensureNode );
		return new Merger( input, options );
	}

	if ( isString( input ) ) {
		input = resolve( config.cwd, input );
		return sources[ input ] || ( sources[ input ] = new Source( input, options ) );
	}
}

function ensureNode ( input ) {
	return getNode( input );
}
