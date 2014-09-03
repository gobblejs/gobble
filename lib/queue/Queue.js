var Queue = function () {
	var self = this,
		tasks = this._tasks = [],
		run;

	run = this._run = function () {
		var task = tasks.shift();

		self.emit( 'start' );

		if ( !task ) {
			self._running = false;
			return;
		}

		task( function () {
			process.nextTick( run );
		});
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

Queue.prototype.clear = function () {
	this._tasks = [];
};

module.exports = Queue;
