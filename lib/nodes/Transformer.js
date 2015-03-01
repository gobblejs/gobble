'use strict';

var path = require('path');
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

exports['default'] = Node['default'].extend({
	init: function init(input, transformer, options, id) {
		var node = this;

		node.input = input;

		node.inspectTargets = [];
		node.transformer = transformer;
		node.options = assign['default']({}, options);

		node.name = id || transformer.id || transformer.name || "unknown";
		node.id = uid['default'](node.name);

		// Double callback style deprecated as of 0.6.x. TODO remove this eventually
		if (transformer.length === 5) {
			warnOnce['default']("The gobble plugin API has changed - the \"%s\" transformer should take a single callback. See https://github.com/gobblejs/gobble/wiki/Troubleshooting for more info", node.name);

			node.transformer = function (inputdir, outputdir, options, callback) {
				return transformer.call(this, inputdir, outputdir, options, function () {
					callback();
				}, callback);
			};
		}

		node.counter = 1;
	},

	ready: function ready() {
		var node = this,
		    outputdir,
		    transformation;

		if (!node._ready) {
			transformation = {
				node: node,
				cachedir: path.resolve(session['default'].config.gobbledir, node.id, ".cache"),
				log: makeLog['default'](node),
				env: config['default'].env,
				sander: sander
			};

			node._abort = function () {
				node._ready = null;
				transformation.aborted = true;
			};

			outputdir = path.resolve(session['default'].config.gobbledir, node.id, "" + node.counter++);
			node._ready = sander.mkdir(outputdir).then(function () {
				return node.input.ready().then(function (inputdir) {
					return queue['default'].add(function (fulfil, reject) {
						var promise, called, callback, start;

						node.emit("info", {
							code: "TRANSFORM_START",
							progressIndicator: true,
							id: node.id
						});

						start = Date.now();

						callback = function (err) {
							var gobbleError, stack, loc;

							if (called) {
								return;
							}

							called = true;

							if (err) {
								stack = err.stack || new Error().stack;

								loc = extractLocationInfo['default'](err);

								gobbleError = new GobbleError['default']({
									message: "transformation failed",
									id: node.id,
									code: "TRANSFORMATION_FAILED",
									original: err,
									stack: stack,
									file: loc.file,
									line: loc.line,
									column: loc.column
								});

								reject(gobbleError);
							} else {
								node.emit("info", {
									code: "TRANSFORM_COMPLETE",
									id: node.id,
									duration: Date.now() - start
								});

								node._cleanup(outputdir);
								fulfil(outputdir);
							}
						};

						try {
							promise = node.transformer.call(transformation, inputdir, outputdir, assign['default']({}, node.options), callback);

							if (promise && typeof promise.then === "function") {
								promise.then(function () {
									callback(); // ensure no argument is passed
								})["catch"](callback);
							}
						} catch (err) {
							callback(err);
						}
					});
				})["catch"](function (err) {
					node._abort();
					queue['default'].abort();

					throw err;
				});
			});
		}

		return node._ready;
	},

	start: function start() {
		var node = this;

		if (this._active) {
			return;
		}

		this._active = true;

		// Propagate errors and information
		this._onerror = function (err) {
			node._abort();
			node.emit("error", err);
		};

		this._oninfo = function (details) {
			node.emit("info", details);
		};

		node.input.on("error", this._onerror);
		node.input.on("info", this._oninfo);

		sander.mkdir(session['default'].config.gobbledir, node.id).then(function () {
			node.input.start();
		})["catch"](function (err) {
			node.emit("error", err);
		});
	},

	stop: function stop() {
		this.input.off("error", this._onerror);
		this.input.off("info", this._oninfo);

		this.input.stop();
		this._active = false;
	},

	_cleanup: function _cleanup(latest) {
		var node = this,
		    dir = path.join(session['default'].config.gobbledir, node.id);

		// Remove everything except the last successful outputdir and the cachedir
		// Use readdirSync to eliminate race conditions
		sander.readdirSync(dir).filter(function (file) {
			return file !== ".cache" && path.resolve(dir, file) !== latest;
		}).forEach(function (file) {
			sander.rimrafSync(dir, file);
		});
	}
});