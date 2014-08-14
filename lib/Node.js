var path = require( 'path' ),
	uid = require( './utils/uid' ),
	yabl = require( './index' ),
	debug = require( './utils/debug' ),
	throttle = require( './utils/throttle' ),
	Promise = require( 'promo' ).Promise;

var Node = function ( inputs, operator ) {
	var node = this;

	node.inputs = inputs;
	node.callbacks = [];
	node.operator = operator;

	node.id = uid( 'yabl' );
	node._dir = path.join( yabl.CWD, '.yabl', node.id );
};

Node.prototype = {
	pipe: function ( operator ) {
		var node = new Node([ this ], operator );
		return node;
	},

	watch: function ( callback ) {
		var node = this;

		yabl.fs.mkdirp( node._dir ).then( function () {
			var relay, done;

			// If this node isn't already in watching mode, it needs to be...
			if ( !node.watching ) {
				relay = function ( srcDir ) {
					node.operator( srcDir, node._dir, done, yabl.fs );
				};

				done = throttle( function () {
					var i = node.callbacks.length;
					while ( i-- ) {
						node.callbacks[i]( node._dir );
					}
				});

				node.inputs.forEach( function ( input ) {
					input.watch( relay );
				});

				node.watching = true;
			}
		}).catch( debug );
	},

	export: function ( dest ) {
		yabl.fs.mkdirp( dest ).then( function () {
			var promises = this.inputs.map( function ( input ) {
				return input.copyTo( dest );
			});

			return Promise.all( promises ).then( function () {
				console.log( 'Exported tree to ' + dest );
			});
		}).catch( debug );

		return this; // chainable
	}
};

module.exports = Node;
