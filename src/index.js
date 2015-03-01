import getNode from './utils/getNode';
import config from './config';
import * as sander from 'sander';

var gobble = function ( inputs, options ) {
	return getNode( inputs, options );
};

gobble.env = function ( env ) {
	if ( arguments.length ) {
		config.env = env;
	}

	return config.env;
};

gobble.cwd = function () {
	if ( arguments.length ) {
		config.cwd = require( 'path' ).resolve.apply( null, arguments );
	}

	return config.cwd;
};

gobble.sander = sander;

export default gobble;
