var EventEmitter2 = require( 'eventemitter2' ).EventEmitter2;

var Queue = function () {
	var queue = this;

	EventEmitter2.call( this, {
		wildcard: true
	});

	queue._tasks = [];

	queue._run = function () {
		var task = queue._tasks.shift();

		if ( !task ) {
			queue._running = false;
			return;
		}

		try {
			task( runOnNextTick );
		} catch ( err ) {
			queue.emit( 'error', err );
			queue.abort();
		}
	};

	function runOnNextTick ( err ) {
		if ( err ) {
			queue.emit( 'error', err );
			queue.abort();
		}

		process.nextTick( queue._run );
	}
};

Queue.prototype = Object.create( require( 'eventemitter2' ).EventEmitter2.prototype );
Queue.prototype.add = function ( task ) {
	this._tasks.push( task );

	if ( !this._running ) {
		this._running = true;
		this._run();
	}
};

Queue.prototype.abort = function () {
	this._tasks = [];
	this._running = false;
};

module.exports = Queue;
