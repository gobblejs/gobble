#!/usr/bin/env node

var findup = require( 'findup-sync' ),
	yabl = require( '../lib' ),
	path = require( 'path' ),
	yablfile,
	tree;

yablfile = findup( 'yablfile.js', { nocase: true });

if ( !yablfile ) {
	throw new Error( 'Could not find a yablfile.js!' );
}

tree = require( yablfile );

yabl.serve( tree, { port: 4567 });

// tree.watch( function ( dir ) {
// 	console.log( 'dir', dir );
// });
