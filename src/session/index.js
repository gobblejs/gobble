import { EventEmitter2 } from 'eventemitter2';

let currentSession;

const session = {
	create: function ( options ) {
		if ( currentSession ) {
			throw new Error( 'Gobble is already running. You can only run one build/serve task per process' );
		}

		session.config = {
			gobbledir: options.gobbledir
		};

		currentSession = new EventEmitter2({ wildcard: true });
		return currentSession;
	},

	destroy: function () {
		currentSession = session.config = null;
	}
};

export default session;
