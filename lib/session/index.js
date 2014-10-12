var EventEmitter = require( 'events' ).EventEmitter,
	util = require( 'util' ),
	currentSession,
	session,
	subtaskRunning;

session = {
	create: function ( options ) {
		if ( currentSession ) {
			throw new Error( 'Gobble is already running. You can only run one build/serve task per process' );
		}

		session.config = {
			gobbledir: options.gobbledir
		};

		currentSession = new EventEmitter();
		return currentSession;
	},

	destroy: function () {
		currentSession = session.config = null;
	},

	emit: function () {
		if ( !currentSession ) {
			throw new Error( 'A message was sent, but no task is running' );
		}

		currentSession.emit.apply( currentSession, arguments );
	},

	info: function () {
		session.emit( 'info', util.format.apply( util, arguments ) );
	},

	warn: function () {
		session.emit( 'warning', util.format.apply( util, arguments ) );
	},

	start: function () {
		var message;

		if ( subtaskRunning ) {
			throw new Error( 'subtask is already running!' );
		}

		subtaskRunning = true;

		message = util.format.apply( util, arguments );
		session.emit( 'start', message );

		return {
			done: function () {
				subtaskRunning = false;
				session.emit( 'stop' );
			}
		};
	},

	error: function ( err ) {
		if ( err.code === 'BUILD_INVALIDATED' ) {
			return;
		}

		if ( typeof err === 'string' ) {
			err = new Error( util.format.apply( null, arguments ) );
		}

		session.emit( 'error', err );
	}
};

module.exports = session;
