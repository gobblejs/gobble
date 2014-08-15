#!/usr/bin/env node

var findup = require( 'findup-sync' ),
	yabl = require( '../lib' ),
	path = require( 'path' ),
	Promise = require( 'promo' ).Promise,
	cwd = require( '../lib/cwd' ),
	yablfile,
	tree,
	cleanup;

yablfile = findup( 'yablfile.js', { nocase: true });

if ( !yablfile ) {
	throw new Error( 'Could not find a yablfile.js!' );
}

tree = require( yablfile );

// Clear out the .yabl folder
var yablDir = path.join( cwd(), '.yabl' );
cleanup = yabl.helpers.readdir( yablDir ).then( function ( files ) {
	console.log( 'Removing %s files from .yabl folder', files.length );
	var promises = files.map( function ( file ) {
		return yabl.helpers.rimraf( yablDir, file );
	});

	return Promise.all( promises );
});

cleanup.then( function () {
	console.log( 'Removed all files. Serving...' );
	yabl.serve( tree, { port: 4567 });
});

// tree.watch( function ( dir ) {
// 	console.log( 'dir', dir );
// });
