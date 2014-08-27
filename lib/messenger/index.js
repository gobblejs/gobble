var EventEmitter = require( 'events' ).EventEmitter,
	util = require( 'util' ),
	ee,
	messenger;

messenger = {
	create: function () {
		if ( ee ) {
			throw new Error( 'Gobble is already running. You can only run one build/serve task per process' );
		}

		ee = new EventEmitter();
		return ee;
	},

	destroy: function () {
		ee = null;
	},

	emit: function () {
		if ( !ee ) {
			throw new Error( 'A message was sent, but no task is running' );
		}

		ee.emit.apply( ee, arguments );
	},

	info: function () {
		messenger.emit( 'info', util.format.apply( util, arguments ) );
	},

	warn: function () {
		messenger.emit( 'warning', util.format.apply( util, arguments ) );
	},

	error: function ( err ) {
		messenger.emit( 'error', err );
	}
};

module.exports = messenger;
