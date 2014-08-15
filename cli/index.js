#!/usr/bin/env node

var findup = require( 'findup-sync' ),
	gobble = require( '../lib' ),
	helpers = gobble.helpers,
	path = require( 'path' ),
	Promise = require( 'promo' ).Promise,
	cwd = require( '../lib/cwd' ),
	debug = require( '../lib/utils/debug' ),
	gobblefile,
	tree,
	cleanup;

gobblefile = findup( 'gobblefile.js', { nocase: true });

if ( !gobblefile ) {
	throw new Error( 'Could not find a gobblefile.js!' );
}

tree = require( gobblefile );

// Clear out the .gobble folder
var gobbleDir = path.join( cwd(), '.gobble' );
cleanup = helpers.mkdirp( gobbleDir ).then( function () {
	return helpers.readdir( gobbleDir ).then( function ( files ) {
		console.log( 'Removing %s files from .gobble folder', files.length );
		var promises = files.map( function ( file ) {
			return helpers.rimraf( gobbleDir, file );
		});

		return Promise.all( promises );
	});
}).catch( debug );

cleanup.then( function () {
	console.log( 'Removed all files. Serving...' );
	gobble.serve( tree, { port: 4567 });
});

// tree.watch( function ( dir ) {
// 	console.log( 'dir', dir );
// });
