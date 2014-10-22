var EventEmitter2 = require( 'eventemitter2' ).EventEmitter2,
	sander = require( 'sander' ),
	path = require( 'path' ),
	fs = require( 'fs' ),
	requireRelative = require( 'require-relative' ),
	builtins = require( '../builtins' ),
	nodes = require( './index' ),
	session = require( '../session' ),

	GobbleError = require( '../utils/GobbleError' ),
	assign = require( '../utils/assign' ),
	warnOnce = require( '../utils/warnOnce' ),

	serve = require( '../serve' ),
	build = require( '../build' );

var Node = function () {};

Node.prototype = assign( Object.create( EventEmitter2.prototype ), {
	_gobble: true, // way to identify gobble trees, even with different copies of gobble (i.e. local and global) running simultaneously

	// This gets overwritten each time this.ready is overwritten. Until
	// the first time that happens, it's a noop
	_abort: function () {},

	transform: function ( fn, userOptions ) {
		var options;

		if ( typeof fn === 'string' ) {
			fn = tryToLoad( fn );
		}

		// If function takes fewer than 3 arguments, it's a file transformer
		if ( fn.length < 3 ) {

			options = assign({}, fn.defaults, userOptions, {
				cache: {},
				fn: fn,
				userOptions: assign( {}, userOptions )
			});

			if ( typeof options.accept === 'string' ) {
				options.accept = [ options.accept ];
			}

			return new nodes.Transformer( this, builtins.map, options, fn.id || fn.name );
		}

		// Otherwise it's a directory transformer
		return new nodes.Transformer( this, fn, userOptions );
	},

	// Built-in transformers
	include: function ( patterns ) {
		if ( typeof patterns === 'string' ) { patterns = [ patterns ]; }
		return new nodes.Transformer( this, builtins.include, { patterns: patterns });
	},

	exclude: function ( patterns ) {
		if ( typeof patterns === 'string' ) { patterns = [ patterns ]; }
		return new nodes.Transformer( this, builtins.include, { patterns: patterns, exclude: true });
	},

	moveTo: function () {
		var dest = path.join.apply( path, arguments );
		return new nodes.Transformer( this, builtins.move, { dest: dest });
	},

	grab: function () {
		var src = path.join.apply( path, arguments );
		return new nodes.Transformer( this, builtins.grab, { src: src });
	},

	map: function ( fn, userOptions ) {
		warnOnce( 'node.map() is deprecated. You should use node.transform() instead for both file and directory transforms' );
		return this.transform( fn, userOptions );
	},

	inspect: function ( target, options ) {
		if ( options && options.clean ) {
			sander.rimraf( target );
		}

		this.inspectTargets.push( path.resolve( process.cwd(), target ) );
		return this; // chainable
	},

	_findCreator: function () {
		return this;
	},

	build: function ( options ) {
		return build( this, options );
	},

	serve: function ( options ) {
		return serve( this, options );
	}
});

Node.extend = function ( methods ) {
	var Child;

	Child = function () {
		EventEmitter2.call( this, {
			wildcard: true
		});

		this.counter = 1;
		this.inspectTargets = [];

		this.init.apply( this, arguments );
	};

	Child.prototype = Object.create( Node.prototype );

	Object.keys( methods ).forEach( function ( key ) {
		Child.prototype[ key ] = methods[ key ];
	});

	return Child;
};

module.exports = Node;


function tryToLoad ( plugin ) {
	var gobbleError;

	try {
		return requireRelative( 'gobble-' + plugin, process.cwd() );
	} catch ( err ) {
		if ( err.message === "Cannot find module 'gobble-" + plugin + "'" ) {
			gobbleError = new GobbleError({
				message: 'Could not load gobble-' + plugin + ' plugin',
				code: 'PLUGIN_NOT_FOUND',
				plugin: plugin
			});

			throw gobbleError;
		} else {
			throw err;
		}
	}
}
