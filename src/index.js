import { resolve } from 'path';
import { Merger, Source } from './nodes';
import * as sander from 'sander';
import config from './config';
import { cyan } from 'chalk';
import { isArray, isString } from './utils/is';

function fail () {
	throw new Error( `could not process input. Usage:
    node2 = gobble(node1)
    node = gobble('some/dir')
    node = gobble([node1, node2[, nodeN]) (inputs can also be strings)
    See ${cyan( 'https://github.com/gobblejs/gobble/wiki' )} for more info.` );
}

let sources = {};

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

	fail();
}

function ensureNode ( input ) {
	return getNode( input );
}

function gobble ( input, options ) {
	// gobble takes 1 or two arguments. The second must be an options object
	if ( arguments.length > 2 || options && ( typeof options !== 'object' || options._gobble ) ) {
		fail();
	}

	return getNode( input, options );
}

gobble.env = function ( env ) {
	if ( arguments.length ) {
		config.env = env;
	}

	return config.env;
};

gobble.cwd = function () {
	if ( arguments.length ) {
		config.cwd = resolve.apply( null, arguments );
	}

	return config.cwd;
};

gobble.sander = sander;

export default gobble;
