#!/usr/bin/env node

var findup = require( 'findup-sync' ),
	gobble = require( '../lib' ),
	file = gobble.file,
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

// Clear out the .gobble folder
var gobbledir = path.join( cwd(), '.gobble' );

cleanup = function () {
	return file.mkdirp( gobbledir ).then( function () {
		return file.readdir( gobbledir ).then( function ( files ) {
			console.log( 'GOBBLE: removing %s files from .gobble folder\n', files.length );
			var promises = files.map( function ( filename ) {
				return file.rimraf( gobbledir, filename );
			});

			return Promise.all( promises );
		});
	});
};

cleanup().then( function () {
	var server, watcher;

	console.log( 'GOBBLE: removed temporary files. serving...\n' );

	server = gobble.serve( gobble( require( gobblefile ) ), { port: 4567 });

	watcher = require( 'chokidar' ).watch( gobblefile, {
		ignoreInitial: true
	});

	watcher.on( 'change', function () {
		console.log( 'GOBBLE: gobblefile changed, restarting server...\n' );
		cleanup().then( function () {
			server.close().then( restart, restart );
		}).catch( debug );
	});

	function restart () {
		delete require.cache[ gobblefile ];
		server = gobble.serve( gobble( require( gobblefile ) ), { port: 4567 });
	}
}).catch( debug );
