'use strict';

var path = require('path');
var sander = require('sander');
var graceful_chokidar = require('graceful-chokidar');
var debounce = require('debounce');
var Node = require('./Node');
var uid = require('../utils/uid');
var session = require('../session');
var GobbleError = require('../utils/GobbleError');

exports['default'] = Node['default'].extend({
	init: function init(dir, options) {
		var node = this,
		    stats;

		options = options || {};

		node.id = options.id || "source";
		node.dir = dir;
		node.callbacks = [];

		// Ensure the source exists, and is a directory
		try {
			stats = sander.statSync(node.dir);

			if (!stats.isDirectory()) {
				node.file = dir;
				node.dir = undefined;

				node.uid = uid['default'](node.id);

				node._ready = new sander.Promise(function (ok, fail) {
					node._deferred = { ok: ok, fail: fail };
				});
			} else {
				node._ready = sander.Promise.resolve(node.dir);
			}
		} catch (err) {
			if (err.code === "ENOENT") {
				throw new GobbleError['default']({
					code: "MISSING_DIRECTORY",
					path: dir,
					message: "the " + dir + " directory does not exist"
				});
			}

			throw err;
		}

		node["static"] = options && options["static"];
	},

	ready: function ready() {
		return this._ready;
	},

	start: function start() {
		var node = this,
		    relay,
		    options,
		    watchError,
		    changes = [];

		if (node._active || node["static"]) {
			return;
		}

		node._active = true;

		// this is a file watch that isn't fully initialized
		if (this._deferred) {
			node._makeReady();
		}

		// make sure the file is in the appropriate target directory to start
		if (node.file) {
			sander.linkSync(node.file).to(node.targetFile);
		}

		relay = debounce(function () {
			var error = new GobbleError['default']({
				code: "INVALIDATED",
				message: "build invalidated",
				changes: changes
			});

			node.emit("error", error);
			changes = [];
		}, 100);

		options = {
			persistent: true,
			ignoreInitial: true,
			useFsEvents: false // see https://github.com/paulmillr/chokidar/issues/146
		};

		node._watcher = graceful_chokidar.watch(node.dir, options);

		["add", "change", "unlink"].forEach(function (type) {
			node._watcher.on(type, function (path) {
				changes.push({ type: type, path: path });
				relay();
			});
		});

		watchError = function (err) {
			var gobbleError;

			gobbleError = new GobbleError['default']({
				message: "error watching " + node.dir + ": " + err.message,
				code: "SOURCE_ERROR",
				original: err
			});

			node.emit("error", gobbleError);
		};

		node._watcher.on("error", watchError);

		if (node.file) {
			node._fileWatcher = graceful_chokidar.watch(node.file, options);

			node._fileWatcher.on("change", function () {
				sander.link(node.file).to(node.targetFile);
			});

			node._fileWatcher.on("error", watchError);
		}
	},

	stop: function stop() {
		if (this._watcher) {
			this._watcher.close();
		}

		if (this._fileWatcher) {
			this._fileWatcher.close();
		}

		this._active = false;
	},

	_findCreator: function _findCreator(filename) {
		try {
			sander.statSync(filename);
			return this;
		} catch (err) {
			return null;
		}
	},

	_makeReady: function _makeReady() {
		var node = this;

		node.dir = path.resolve(session['default'].config.gobbledir, node.uid);
		node.targetFile = path.resolve(node.dir, path.basename(node.file));
		try {
			sander.mkdirSync(node.dir);
			node._deferred.ok(node.dir);
		} catch (e) {
			node._deferred.fail(e);
			throw e;
		}

		delete node._deferred;
	}
});