import buble from 'rollup-plugin-buble';

// prevent a bunch of console messages
var external = Object.keys( require( './package.json' ).dependencies );
external.push( 'fs', 'path', 'url', 'util', 'http' );

export default {
	entry: 'src/index.js',
	dest: 'dist/gobble.js',
	format: 'cjs',
	plugins: [ buble() ],
	external: external
};
