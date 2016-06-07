import { EventEmitter2 } from 'eventemitter2';
import { Promise } from 'sander';

export default class Queue extends EventEmitter2 {
	constructor () {
		super({ wildcard: true });

		var queue = this;

		queue._tasks = [];

		queue._run = () => {
			const task = queue._tasks.shift();

			if ( !task ) {
				queue._running = false;
				return;
			}

			task.promise.then( runOnNextTick, runOnNextTick );

			try {
				task.fn( task.fulfil, task.reject );
			} catch ( err ) {
				task.reject( err );

				queue.emit( 'error', err );
				runOnNextTick();
			}
		};

		function runOnNextTick () {
			process.nextTick( queue._run );
		}
	}

	add ( fn ) {
		let task;

		const promise = new Promise( ( fulfil, reject ) => {
			task = { fn, fulfil, reject };
		});

		task.promise = promise;
		this._tasks.push( task );

		if ( !this._running ) {
			this._running = true;
			this._run();
		}

		return promise;
	}

	abort () {
		this._tasks = [];
		this._running = false;
	}
}
