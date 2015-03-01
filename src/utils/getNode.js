import { resolve } from 'path';
import { cyan } from 'chalk';
import { Merger, Source } from '../nodes';
import config from '../config';
import { isArray, isString } from './is';

var sources = {};

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

	throw new Error( `could not process input. Usage:
    node2 = gobble(node1)
    node = gobble(\'some/dir\')
    node = gobble([node1, node2[, nodeN]) (inputs can also be strings)
    See ` + cyan( 'https://github.com/gobblejs/gobble/wiki' ) + ' for more info.' );
}

function ensureNode ( input ) {
	return getNode( input );
}
