'use strict';

var eventemitter2 = require('eventemitter2');
var sander = require('sander');
var path = require('path');
var requireRelative = require('require-relative');
var builtins = require('../builtins');
var index = require('./index');
var config = require('../config');
var GobbleError = require('../utils/GobbleError');
var assign = require('../utils/assign');
var warnOnce = require('../utils/warnOnce');
var ___serve = require('./serve');
var ___build = require('./build');
var ___watch = require('./watch');
var is = require('../utils/is');

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var Node = (function (_EventEmitter2) {
	function Node() {
		_classCallCheck(this, Node);

		this._gobble = true; // makes life easier for e.g. gobble-cli

		// initialise event emitter
		_EventEmitter2.call(this, { wildcard: true });

		this.counter = 1;
		this.inspectTargets = [];
	}

	_inherits(Node, _EventEmitter2);

	// This gets overwritten each time this.ready is overwritten. Until
	// the first time that happens, it's a noop

	Node.prototype._abort = function _abort() {};

	Node.prototype._findCreator = function _findCreator() {
		return this;
	};

	Node.prototype.build = (function (_build) {
		var _buildWrapper = function build(_x) {
			return _build.apply(this, arguments);
		};

		_buildWrapper.toString = function () {
			return _build.toString();
		};

		return _buildWrapper;
	})(function (options) {
		return ___build['default'](this, options);
	});

	Node.prototype.createWatchTask = function createWatchTask() {
		var node = this,
		    watchTask,
		    buildScheduled,
		    previousDetails;

		watchTask = new eventemitter2.EventEmitter2({ wildcard: true });

		// TODO is this the best place to handle this stuff? or is it better
		// to pass off the info to e.g. gobble-cli?
		node.on("info", function (details) {
			if (details === previousDetails) return;
			previousDetails = details;
			watchTask.emit("info", details);
		});

		node.on("error", handleError);

		function build() {
			var buildStart = Date.now();

			buildScheduled = false;

			node.ready().then(function (d) {
				watchTask.emit("info", {
					code: "BUILD_COMPLETE",
					duration: Date.now() - buildStart,
					watch: true
				});

				watchTask.emit("built", d);
			})["catch"](handleError);
		}

		function handleError(e) {
			if (e.code === "MERGE_ABORTED") {
				return;
			}

			if (e.code === "INVALIDATED") {
				// A node can depend on the same source twice, which will result in
				// simultaneous rebuilds unless we defer it to the next tick
				if (!buildScheduled) {
					buildScheduled = true;
					watchTask.emit("info", {
						code: "BUILD_INVALIDATED",
						changes: e.changes
					}); //util.format( 'build invalidated (%s). restarting', summariseChanges( e.changes ) ) );

					process.nextTick(build);
				}
			} else {
				watchTask.emit("error", e);
			}
		}

		watchTask.close = function () {
			node.stop();
		};

		this.start();
		build();

		return watchTask;
	};

	Node.prototype.exclude = function exclude(patterns) {
		if (typeof patterns === "string") {
			patterns = [patterns];
		}
		return new index.Transformer(this, builtins.include, { patterns: patterns, exclude: true });
	};

	Node.prototype.grab = (function (_grab) {
		var _grabWrapper = function grab() {
			return _grab.apply(this, arguments);
		};

		_grabWrapper.toString = function () {
			return _grab.toString();
		};

		return _grabWrapper;
	})(function () {
		var src = path.join.apply(null, arguments);
		return new index.Transformer(this, builtins.grab, { src: src });
	});

	// Built-in transformers

	Node.prototype.include = (function (_include) {
		var _includeWrapper = function include(_x2) {
			return _include.apply(this, arguments);
		};

		_includeWrapper.toString = function () {
			return _include.toString();
		};

		return _includeWrapper;
	})(function (patterns) {
		if (typeof patterns === "string") {
			patterns = [patterns];
		}
		return new index.Transformer(this, builtins.include, { patterns: patterns });
	});

	Node.prototype.inspect = function inspect(target, options) {
		target = path.resolve(config['default'].cwd, target);

		if (options && options.clean) {
			sander.rimraf(target);
		}

		this.inspectTargets.push(target);
		return this; // chainable
	};

	Node.prototype.map = function map(fn, userOptions) {
		warnOnce['default']("node.map() is deprecated. You should use node.transform() instead for both file and directory transforms");
		return this.transform(fn, userOptions);
	};

	Node.prototype.moveTo = function moveTo() {
		var dest = path.join.apply(null, arguments);
		return new index.Transformer(this, builtins.move, { dest: dest });
	};

	Node.prototype.serve = (function (_serve) {
		var _serveWrapper = function serve(_x3) {
			return _serve.apply(this, arguments);
		};

		_serveWrapper.toString = function () {
			return _serve.toString();
		};

		return _serveWrapper;
	})(function (options) {
		return ___serve['default'](this, options);
	});

	Node.prototype.transform = function transform(fn, userOptions) {
		var options;

		if (typeof fn === "string") {
			fn = tryToLoad(fn);
		}

		// If function takes fewer than 3 arguments, it's a file transformer
		if (fn.length < 3) {

			options = assign['default']({}, fn.defaults, userOptions, {
				cache: {},
				fn: fn,
				userOptions: assign['default']({}, userOptions)
			});

			if (typeof options.accept === "string" || is.isRegExp(options.accept)) {
				options.accept = [options.accept];
			}

			return new index.Transformer(this, builtins.map, options, fn.id || fn.name);
		}

		// Otherwise it's a directory transformer
		return new index.Transformer(this, fn, userOptions);
	};

	Node.prototype.watch = (function (_watch) {
		var _watchWrapper = function watch(_x4) {
			return _watch.apply(this, arguments);
		};

		_watchWrapper.toString = function () {
			return _watch.toString();
		};

		return _watchWrapper;
	})(function (options) {
		return ___watch['default'](this, options);
	});

	return Node;
})(eventemitter2.EventEmitter2);

exports['default'] = Node;

function tryToLoad(plugin) {
	var gobbleError;

	try {
		return requireRelative("gobble-" + plugin, process.cwd());
	} catch (err) {
		if (err.message === "Cannot find module 'gobble-" + plugin + "'") {
			gobbleError = new GobbleError['default']({
				message: "Could not load gobble-" + plugin + " plugin",
				code: "PLUGIN_NOT_FOUND",
				plugin: plugin
			});

			throw gobbleError;
		} else {
			throw err;
		}
	}
}