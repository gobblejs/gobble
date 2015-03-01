'use strict';

var eventemitter2 = require('eventemitter2');
var sander = require('sander');

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var Queue = (function (EventEmitter2) {
	function Queue() {
		_classCallCheck(this, Queue);

		var queue = this;

		EventEmitter2.call(this, { wildcard: true });

		queue._tasks = [];

		queue._run = function () {
			var task = queue._tasks.shift();

			if (!task) {
				queue._running = false;
				return;
			}

			task.promise.then(runOnNextTick, runOnNextTick);

			try {
				task.fn(task.fulfil, task.reject);
			} catch (err) {
				task.reject(err);

				queue.emit("error", err);
				runOnNextTick();
			}
		};

		function runOnNextTick() {
			process.nextTick(queue._run);
		}
	}

	_inherits(Queue, EventEmitter2);

	Queue.prototype.add = function add(fn) {
		var task, promise;

		promise = new sander.Promise(function (fulfil, reject) {
			task = { fn: fn, fulfil: fulfil, reject: reject };
		});

		task.promise = promise;
		this._tasks.push(task);

		if (!this._running) {
			this._running = true;
			this._run();
		}

		return promise;
	};

	Queue.prototype.abort = function abort() {
		this._tasks = [];
		this._running = false;
	};

	return Queue;
})(eventemitter2.EventEmitter2);

exports['default'] = Queue;