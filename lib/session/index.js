'use strict';

var eventemitter2 = require('eventemitter2');

var currentSession = undefined;

var session = {
	create: function create(options) {
		if (currentSession) {
			throw new Error("Gobble is already running. You can only run one build/serve task per process");
		}

		session.config = {
			gobbledir: options.gobbledir
		};

		currentSession = new eventemitter2.EventEmitter2({ wildcard: true });
		return currentSession;
	},

	destroy: function destroy() {
		currentSession = session.config = null;
	}
};

exports['default'] = session;