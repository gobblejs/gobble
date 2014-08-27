var Node = require( '../Node' ),
	Merger = require( '../Merger' ),
	Source = require( '../Source' );

module.exports = getNode;

var sources = {};

function getNode ( input, options ) {
	if ( input._gobble ) {
		if ( options ) {
			return new Node( input, options );
		}

		return input;
	}

	if ( isArray( input ) ) {
		input = input.map( ensureNode );
		return new Merger( input, options );
	}

	if ( isString( input ) ) {
		return sources[ input ] || ( sources[ input ] = new Source( input, options ) );
	}

	throw new Error( 'could not process input. Usage:\n    tree2 = gobble(tree1)\n    tree = gobble(\'some/dir\')\n    tree = gobble([tree1, tree2[, treeN]) (inputs can also be strings)\n    See ' + 'https://github.com/gobblejs/gobble/wiki'.cyan + ' for more info.' );
}

function isArray( thing ) {
	return Object.prototype.toString.call( thing ) === '[object Array]';
}

function isString ( thing ) {
	return typeof thing === 'string';
}

function ensureNode ( input ) {
	return getNode( input );
}
