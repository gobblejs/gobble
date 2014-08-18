#!/usr/bin/env node

var findup = require( 'findup-sync' ),
	gobble = require( '../lib' ),
	file = gobble.file,
	path = require( 'path' ),
	Promise = require( 'promo' ).Promise,
	config = require( '../lib/config' ),
	debug = require( '../lib/utils/debug' ),
	parseOptions = require( './utils/parseOptions' ),
	serve = require( './serve' ),
	build = require( './build' ),
	help = require( './help' ),
	gobblefile,
	tree;

var command = parseOptions({
	p: 'port',
	h: 'help',
	f: 'force',
	e: 'env'
});

if ( command.options.help ) {
	return help( command );
}

// Execute command
if ( command.args[0] === 'build' ) {
	gobble.env = command.options.env || 'production';
	gobble.isBuild = true;
	return build( command );
}

if ( !command.args[0] || command.args[0] === 'serve' ) {
	gobble.env = command.options.env || 'development';
	gobble.isBuild = false;
	return serve( command );
}

return help( command );
