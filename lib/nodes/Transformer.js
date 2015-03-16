'use strict';

var path = require('path');
var crc32 = require('buffer-crc32');
var sander = require('sander');
var Node = require('./Node');
var session = require('../session');
var queue = require('../queue');
var GobbleError = require('../utils/GobbleError');
var assign = require('../utils/assign');
var uid = require('../utils/uid');
var makeLog = require('../utils/makeLog');
var config = require('../config');
var warnOnce = require('../utils/warnOnce');
var extractLocationInfo = require('../utils/extractLocationInfo');

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var Transformer = (function (_Node) {
	function Transformer(input, transformer, options, id) {
		var _this = this;

		_classCallCheck(this, Transformer);

		_Node.call(this);

		this.input = input;

		this.transformer = transformer;
		this.options = assign['default']({}, options);

		this.name = id || transformer.id || transformer.name || "unknown";
		this.id = uid['default'](this.name);

		// Double callback style deprecated as of 0.6.x. TODO remove this eventually
		if (transformer.length === 5) {
			warnOnce['default']("The gobble plugin API has changed - the \"%s\" transformer should take a single callback. See https://github.com/gobblejs/gobble/wiki/Troubleshooting for more info", this.name);

			this.transformer = function (inputdir, outputdir, options, callback) {
				return transformer.call(_this, inputdir, outputdir, options, function () {
					callback();
				}, callback);
			};
		}
	}

	_inherits(Transformer, _Node);

	Transformer.prototype.ready = function ready() {
		var _this = this;

		var outputdir, transformation;

		if (!this._ready) {
			transformation = {
				node: this,
				cachedir: path.resolve(session['default'].config.gobbledir, this.id, ".cache"),
				log: makeLog['default'](this),
				env: config['default'].env,
				sander: sander
			};

			this._abort = function () {
				_this._ready = null;
				transformation.aborted = true;
			};

			outputdir = path.resolve(session['default'].config.gobbledir, this.id, "" + this.counter++);

			this._ready = sander.mkdir(outputdir).then(function () {
				return _this.input.ready().then(function (inputdir) {
					return queue['default'].add(function (fulfil, reject) {
						var promise, called, callback, start;

						_this.emit("info", {
							code: "TRANSFORM_START",
							progressIndicator: true,
							id: _this.id
						});

						start = Date.now();

						callback = function (err) {
							if (called) {
								return;
							}

							called = true;

							if (err) {
								var stack = err.stack || new Error().stack;

								var _extractLocationInfo = extractLocationInfo['default'](err);

								var file = _extractLocationInfo.file;
								var line = _extractLocationInfo.line;
								var column = _extractLocationInfo.column;

								var gobbleError = new GobbleError['default']({
									message: "transformation failed",
									id: _this.id,
									code: "TRANSFORMATION_FAILED",
									original: err,
									stack: stack, file: file, line: line, column: column
								});

								reject(gobbleError);
							} else {
								_this.emit("info", {
									code: "TRANSFORM_COMPLETE",
									id: _this.id,
									duration: Date.now() - start
								});

								_this._cleanup(outputdir);
								fulfil(outputdir);
							}
						};

						try {
							transformation.changes = _this.input.changes || _this.getChanges(inputdir);

							promise = _this.transformer.call(transformation, inputdir, outputdir, assign['default']({}, _this.options), callback);

							if (promise && typeof promise.then === "function") {
								promise.then(function () {
									return callback();
								}, callback);
							}
						} catch (err) {
							callback(err);
						}
					});
				})["catch"](function (err) {
					_this._abort();
					queue['default'].abort();

					throw err;
				});
			});
		}

		return this._ready;
	};

	Transformer.prototype.start = function start() {
		var _this = this;

		if (this._active) {
			return;
		}

		this._active = true;

		// Propagate errors and information
		this._onerror = function (err) {
			_this._abort();
			_this.emit("error", err);
		};

		this._oninfo = function (details) {
			_this.emit("info", details);
		};

		this.input.on("error", this._onerror);
		this.input.on("info", this._oninfo);

		sander.mkdir(session['default'].config.gobbledir, this.id).then(function () {
			_this.input.start();
		})["catch"](function (err) {
			_this.emit("error", err);
		});
	};

	Transformer.prototype.stop = function stop() {
		this.input.off("error", this._onerror);
		this.input.off("info", this._oninfo);

		this.input.stop();
		this._active = false;
	};

	Transformer.prototype.getChanges = function getChanges(inputdir) {
		var _this = this;

		var files = sander.lsrSync(inputdir);

		if (!this._files) {
			this._files = files;
			this._checksums = {};

			files.forEach(function (file) {
				_this._checksums[file] = crc32(sander.readFileSync(inputdir, file));
			});

			return files.map(function (file) {
				return { file: file, added: true };
			});
		}

		var added = files.filter(function (file) {
			return ! ~_this._files.indexOf(file);
		}).map(function (file) {
			return { file: file, added: true };
		});
		var removed = this._files.filter(function (file) {
			return ! ~files.indexOf(file);
		}).map(function (file) {
			return { file: file, removed: true };
		});

		var maybeChanged = files.filter(function (file) {
			return ~_this._files.indexOf(file);
		});

		var changed = [];

		maybeChanged.forEach(function (file) {
			var checksum = crc32(sander.readFileSync(inputdir, file));
			if (checksum !== _this._checksums[file]) {
				changed.push({ file: file, changed: true });
				_this._checksums[file] = checksum;
			}
		});

		return added.concat(removed).concat(changed);
	};

	Transformer.prototype._cleanup = function _cleanup(latest) {
		var dir = path.join(session['default'].config.gobbledir, this.id);

		// Remove everything except the last successful outputdir and the cachedir
		// Use readdirSync to eliminate race conditions
		sander.readdirSync(dir).filter(function (file) {
			return file !== ".cache" && path.resolve(dir, file) !== latest;
		}).forEach(function (file) {
			return sander.rimrafSync(dir, file);
		});
	};

	return Transformer;
})(Node['default']);

exports['default'] = Transformer;