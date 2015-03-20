'use strict';

var path = require('path');
var sander = require('sander');
var mapSeries = require('promise-map-series');
var Node = require('./Node');
var session = require('../session');
var merge = require('../file/merge');
var uid = require('../utils/uid');
var GobbleError = require('../utils/GobbleError');

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var Merger = (function (_Node) {
	function Merger(inputs, options) {
		_classCallCheck(this, Merger);

		_Node.call(this);

		this.inputs = inputs;
		this.id = uid['default'](options && options.id || "merge");
	}

	_inherits(Merger, _Node);

	Merger.prototype.ready = function ready() {
		var _this = this;

		var aborted, index, outputdir;

		if (!this._ready) {
			this._abort = function () {
				// allows us to short-circuit operations at various points
				aborted = new GobbleError['default']({
					code: "MERGE_ABORTED",
					id: _this.id,
					message: "merge aborted"
				});

				_this._ready = null;
			};

			index = this.counter++;
			outputdir = path.resolve(session['default'].config.gobbledir, this.id, "" + index);

			this._ready = sander.mkdir(outputdir).then(function () {
				var start,
				    inputdirs = [];

				return mapSeries(_this.inputs, function (input, i) {
					if (aborted) throw aborted;

					return input.ready().then(function (inputdir) {
						inputdirs[i] = inputdir;
					});
				}).then(function () {
					start = Date.now();

					_this.emit("info", {
						code: "MERGE_START",
						id: _this.id,
						progressIndicator: true
					});

					return mapSeries(inputdirs, function (inputdir) {
						if (aborted) {
							throw aborted;
						}

						return merge['default'](inputdir).to(outputdir);
					});
				}).then(function () {
					if (aborted) throw aborted;

					_this._cleanup(index);

					_this.emit("info", {
						code: "MERGE_COMPLETE",
						id: _this.id,
						duration: Date.now() - start
					});

					return outputdir;
				});
			});
		}

		return this._ready;
	};

	Merger.prototype.start = function start() {
		var _this = this;

		if (this._active) {
			return;
		}

		this._active = true;

		this._onerror = function (err) {
			_this._abort();
			_this.emit("error", err);
		};

		this._oninfo = function (details) {
			_this.emit("info", details);
		};

		this.inputs.forEach(function (input) {
			input.on("error", _this._onerror);
			input.on("info", _this._oninfo);

			input.start();
		});
	};

	Merger.prototype.stop = function stop() {
		var _this = this;

		this.inputs.forEach(function (input) {
			input.off("error", _this._onerror);
			input.off("info", _this._oninfo);

			input.stop();
		});

		this._active = false;
	};

	Merger.prototype._cleanup = function _cleanup(index) {
		var dir = path.join(session['default'].config.gobbledir, this.id);

		// Remove everything except the last successful output dir.
		// Use readdirSync to eliminate race conditions
		sander.readdirSync(dir).filter(function (file) {
			return file !== ".cache" && +file < index;
		}).forEach(function (file) {
			return sander.rimrafSync(dir, file);
		});
	};

	Merger.prototype._findCreator = function _findCreator(filename) {
		var i = this.inputs.length,
		    node;
		while (i--) {
			node = this.inputs[i];
			if (node._findCreator(filename)) {
				return node;
			}
		}

		return null;
	};

	return Merger;
})(Node['default']);

exports['default'] = Merger;