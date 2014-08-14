var path = require( 'path' ),
	uid = require( './utils/uid' ),
	helpers = require( './helpers' ),
	cwd = require( './cwd' ),
	debug = require( './utils/debug' ),
	throttle = require( './utils/throttle' ),
	Promise = require( 'promo' ).Promise;

var Node = function ( inputs, operator ) {
	var node = this;

	node.inputs = inputs;
	node.callbacks = [];
	node.operator = operator;

	node.id = uid( 'yabl' );
	node._dir = path.join( cwd(), '.yabl', node.id );
};

Node.prototype = {
	transform: function ( operator ) {
		var node = new Node([ this ], operator );
		return node;
	},

	map: function ( fn ) {
		var node, operator;

		operator = function ( srcDir, destDir, done, helpers ) {
			helpers.glob( path.join( srcDir, '**' ) ).then( function ( files ) {
				var promises;

				promises = files.map( function ( file ) {
					return helpers.stat( file ).then( function ( stats ) {
						if ( stats.isDirectory() ) {
							return;
						}

						return helpers.read( file ).then( function ( data ) {
							var result = fn( data.toString() );
							return helpers.write( file.replace( srcDir, destDir ), result );
						});
					});
				});

				return Promise.all( promises ).then( done );
			}).catch( debug );
		};

		node = new Node([ this ], operator );
		return node;
	},

	watch: function ( callback ) {
		var node = this;

		helpers.mkdirp( node._dir ).then( function () {
			var relay, done;

			// If this node isn't already in watching mode, it needs to be...
			if ( !node.watching ) {
				relay = function ( srcDir ) {
					console.log( 'relaying %s -> %s', srcDir, node._dir );
					node.operator( srcDir, node._dir, done, helpers );
				};

				done = throttle( function () {
					var i = node.callbacks.length;
					while ( i-- ) {
						node.callbacks[i]( null, node._dir );
					}
				});

				node.inputs.forEach( function ( input ) {
					input.watch( relay );
				});

				node.watching = true;
			}
		}).catch( debug );

		node.callbacks.push( callback );
	},

	export: function ( dest ) {
		var node = this;

		helpers.mkdirp( dest ).then( function () {
			var promises = node.inputs.map( function ( input ) {
				return input.copyTo( dest );
			});

			return Promise.all( promises ).then( function () {
				console.log( 'Exported tree to ' + dest );
			});
		}).catch( debug );

		return node; // chainable
	}
};

module.exports = Node;
