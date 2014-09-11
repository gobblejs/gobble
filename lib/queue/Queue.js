var Queue = function () {
	var queue = this;

	queue._tasks = [];

	queue._run = function () {
		var task = queue._tasks.shift();

		if ( !task ) {
			queue._running = false;
			return;
		}

		task( runOnNextTick );
	};

	function runOnNextTick () {
		process.nextTick( queue._run );
	}
};

Queue.prototype = Object.create( require( 'events' ).EventEmitter.prototype );
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
