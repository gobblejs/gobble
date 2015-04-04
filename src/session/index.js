import { EventEmitter2 } from 'eventemitter2';

let currentSession;

const session = {
	config: null, // mutable

	create ( options ) {
		if ( currentSession ) {
			throw new Error( 'Gobble is already running. You can only run one build/serve task per process' );
		}

		session.config = {
			gobbledir: options.gobbledir
		};

		currentSession = new EventEmitter2({ wildcard: true });
		return currentSession;
	},

	destroy () {
		currentSession = session.config = null;
	}
};

export default session;
