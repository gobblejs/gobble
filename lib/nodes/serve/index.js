'use strict';

var http = require('http');
var path = require('path');
var sander = require('sander');
var tinyLr = require('tiny-lr');
var cleanup = require('../../utils/cleanup');
var session = require('../../session');
var GobbleError = require('../../utils/GobbleError');
var handleRequest = require('./handleRequest');



exports['default'] = serve;
function serve(node, options) {
	var server,
	    serverReady,
	    lrServer,
	    lrServerReady,
	    built = false,
	    firedReadyEvent = false,
	    task,
	    watchTask,
	    port,
	    gobbledir,
	    error = { gobble: "WAITING" },
	    srcDir,
	    buildStarted = Date.now();

	options = options || {};

	port = options.port || 4567;
	gobbledir = path.resolve(options.gobbledir || process.env.GOBBLE_TMP_DIR || ".gobble");

	task = session['default'].create({
		gobbledir: gobbledir
	});

	task.close = function () {
		if (node) {
			node.stop();
		}

		return new sander.Promise(function (fulfil) {
			session['default'].destroy();
			server.removeAllListeners();
			server.close(fulfil);
		});
	};

	task.pause = function () {
		error = { gobble: "WAITING" };

		buildStarted = Date.now();

		if (node) {
			node.stop();
		}

		node = null;

		return cleanup['default'](gobbledir);
	};

	task.resume = function (n) {
		node = n;
		watchTask = node.createWatchTask();

		watchTask.on("info", function (details) {
			task.emit("info", details);
		});

		watchTask.on("error", function (err) {
			error = err;
			task.emit("error", err);
		});

		watchTask.on("built", function (d) {
			error = null;
			srcDir = d;

			built = true;

			task.emit("built");

			if (!firedReadyEvent && serverReady) {
				task.emit("ready");
				firedReadyEvent = true;
			}

			if (!lrServerReady) {
				return;
			}

			lrServer.changed({ body: { files: "*" } });
		});
	};

	server = http.createServer();

	server.on("error", function (err) {
		if (err.code === "EADDRINUSE") {
			// We need to create our own error, so we can pass along port info
			err = new GobbleError['default']({
				code: "PORT_IN_USE",
				message: "port " + port + " is already in use",
				port: port
			});
		}

		task.emit("error", err);

		process.exit(1);
	});

	server.listen(port, function () {
		serverReady = true;

		if (!firedReadyEvent && built) {
			task.emit("ready");
			firedReadyEvent = true;
		}

		task.emit("info", {
			code: "SERVER_LISTENING",
			port: port
		});
	});

	server.on("request", function (request, response) {
		handleRequest['default'](srcDir, error, request, response)["catch"](function (err) {
			task.emit("error", err);
		});
	});

	lrServer = tinyLr();
	lrServer.error = function (err) {
		if (err.code === "EADDRINUSE") {
			task.emit("warning", "a livereload server is already running (perhaps in a separate gobble process?). Livereload will not be available for this session");
		} else {
			task.emit("error", err);
		}
	};

	lrServer.listen(35729, function () {
		lrServerReady = true;
		task.emit("info", {
			code: "LIVERELOAD_RUNNING"
		});
	});

	cleanup['default'](gobbledir).then(function () {
		task.resume(node);
	}, function (err) {
		task.emit("error", err);
	});

	return task;
}