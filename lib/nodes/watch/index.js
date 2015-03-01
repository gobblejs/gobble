'use strict';

var sander = require('sander');
var cleanup = require('../../utils/cleanup');
var session = require('../../session');
var GobbleError = require('../../utils/GobbleError');



exports['default'] = watch;
function watch(node, options) {
	var dest, gobbledir, watchTask, task;

	if (!options || !options.dest) {
		throw new GobbleError['default']({
			code: "MISSING_DEST_DIR",
			task: "watch"
		});
	}

	dest = options.dest;
	gobbledir = require("path").resolve(options.gobbledir || process.env.GOBBLE_TMP_DIR || ".gobble-watch");

	task = session['default'].create({
		gobbledir: gobbledir
	});

	task.close = function () {
		watchTask.close();
		session['default'].destroy();

		return sander.Promise.resolve(); // for consistency with serve task
	};

	task.pause = function () {
		if (watchTask) {
			watchTask.close();
		}

		watchTask = null;
		return cleanup['default'](gobbledir);
	};

	task.resume = function (n) {
		node = n;
		watchTask = node.createWatchTask();

		watchTask.on("info", function (details) {
			task.emit("info", details);
		});

		watchTask.on("error", function (err) {
			task.emit("error", err);
		});

		watchTask.on("built", function (d) {
			sander.rimraf(dest).then(function () {
				return sander.copydir(d).to(dest).then(function () {
					task.emit("built", dest);
				});
			})["catch"](function (err) {
				task.emit("error", err);
			});
		});
	};

	cleanup['default'](gobbledir).then(function () {
		task.resume(node);
	}, function (err) {
		task.emit("error", err);
	});

	return task;
}