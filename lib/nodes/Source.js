'use strict';

var path = require('path');
var sander = require('sander');
var graceful_chokidar = require('graceful-chokidar');
var debounce = require('debounce');
var Node = require('./Node');
var uid = require('../utils/uid');
var session = require('../session');
var GobbleError = require('../utils/GobbleError');

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var Source = (function (Node) {
	function Source(dir) {
		var _this = this;

		var options = arguments[1] === undefined ? {} : arguments[1];

		_classCallCheck(this, Source);

		Node.call(this);

		this.id = options.id || "source";
		this.dir = dir;
		this.callbacks = [];

		// Ensure the source exists, and is a directory
		try {
			var stats = sander.statSync(this.dir);

			if (!stats.isDirectory()) {
				this.file = dir;
				this.dir = undefined;

				this.uid = uid['default'](this.id);

				this._ready = new sander.Promise(function (ok, fail) {
					_this._deferred = { ok: ok, fail: fail };
				});
			} else {
				this._ready = sander.Promise.resolve(this.dir);
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

		this["static"] = options && options["static"];
	}

	_inherits(Source, Node);

	Source.prototype.ready = function ready() {
		return this._ready;
	};

	Source.prototype.start = function start() {
		var _this = this;

		var relay,
		    options,
		    watchError,
		    changes = [];

		if (this._active || this["static"]) {
			return;
		}

		this._active = true;

		// this is a file watch that isn't fully initialized
		if (this._deferred) {
			this._makeReady();
		}

		// make sure the file is in the appropriate target directory to start
		if (this.file) {
			sander.linkSync(this.file).to(this.targetFile);
		}

		relay = debounce(function () {
			var error = new GobbleError['default']({
				code: "INVALIDATED",
				message: "build invalidated",
				changes: changes
			});

			_this.changes = changes.map(function (change) {
				var result = {
					file: path.relative(_this.dir, change.path)
				};

				change.type === "add" && (change.added = true);
				change.type === "change" && (change.changed = true);
				change.type === "unlink" && (change.removed = true);

				return result;
			});

			_this.emit("error", error);
			changes = [];
		}, 100);

		options = {
			persistent: true,
			ignoreInitial: true,
			useFsEvents: false // see https://github.com/paulmillr/chokidar/issues/146
		};

		this._watcher = graceful_chokidar.watch(this.dir, options);

		["add", "change", "unlink"].forEach(function (type) {
			_this._watcher.on(type, function (path) {
				changes.push({ type: type, path: path });
				relay();
			});
		});

		watchError = function (err) {
			var gobbleError = new GobbleError['default']({
				message: "error watching " + _this.dir + ": " + err.message,
				code: "SOURCE_ERROR",
				original: err
			});

			_this.emit("error", gobbleError);
		};

		this._watcher.on("error", watchError);

		if (this.file) {
			this._fileWatcher = graceful_chokidar.watch(this.file, options);

			this._fileWatcher.on("change", function () {
				sander.link(_this.file).to(_this.targetFile);
			});

			this._fileWatcher.on("error", watchError);
		}
	};

	Source.prototype.stop = function stop() {
		if (this._watcher) {
			this._watcher.close();
		}

		if (this._fileWatcher) {
			this._fileWatcher.close();
		}

		this._active = false;
	};

	Source.prototype._findCreator = function _findCreator(filename) {
		try {
			sander.statSync(filename);
			return this;
		} catch (err) {
			return null;
		}
	};

	Source.prototype._makeReady = function _makeReady() {
		this.dir = path.resolve(session['default'].config.gobbledir, this.uid);
		this.targetFile = path.resolve(this.dir, path.basename(this.file));

		try {
			sander.mkdirSync(this.dir);
			this._deferred.ok(this.dir);
		} catch (e) {
			this._deferred.fail(e);
			throw e;
		}

		delete this._deferred;
	};

	return Source;
})(Node['default']);

exports['default'] = Source;