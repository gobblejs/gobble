var EventEmitter = require( 'events' ).EventEmitter,
	util = require( 'util' ),
	ee,
	messenger,
	subtaskRunning;

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

	start: function () {
		var message;

		if ( subtaskRunning ) {
			throw new Error( 'subtask is already running!' );
		}

		subtaskRunning = true;

		message = util.format.apply( util, arguments );
		messenger.emit( 'start', message );

		return {
			done: function () {
				subtaskRunning = false;
				messenger.emit( 'stop' );
			}
		};
	},

	error: function ( err ) {
		messenger.emit( 'error', err );
	}
};

module.exports = messenger;
