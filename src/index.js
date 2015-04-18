import { resolve } from 'path';
import * as sander from 'sander';
import getNode from './utils/getNode';
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

function gobble ( input, options ) {
	// gobble takes 1 or two arguments. The second must be an options object
	if ( arguments.length > 2 || options && ( typeof options !== 'object' || options._gobble ) ) {
		fail();
	}

	// `input` must be a gobble node, a path, or an array of nodes
	if ( !input._gobble && !isString( input ) && !isArray( input ) ) {
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
