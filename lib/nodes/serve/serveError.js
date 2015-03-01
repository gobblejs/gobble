'use strict';

var errTemplate = require('./templates/err');
var waitingTemplate = require('./templates/waiting');
var notfoundTemplate = require('./templates/notfound');



exports['default'] = serveError;

var entities = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;",
	"/": "&#x2F;"
};

var colors = {
	37: "white",
	90: "grey",
	30: "black",
	34: "blue",
	36: "cyan",
	32: "green",
	35: "magenta",
	31: "red",
	33: "yellow"
};
function serveError(error, request, response) {
	if (error.gobble === "WAITING") {
		response.statusCode = 420;
		response.write(waitingTemplate['default']());

		response.end();
	} else if (error.code === "ENOENT") {
		var html = notfoundTemplate['default']({
			path: error.path
		});

		response.statusCode = 404;
		response.write(html);

		response.end();
	} else {
		var html, id, message, filename;

		id = error.id;
		message = escape(error.original ? error.original.message || error.original : error);
		filename = error.original ? error.original.filename : error.filename;

		html = errTemplate['default']({
			id: id,
			message: message.replace(/\[(\d+)m/g, function (match, $1) {
				var color;

				if (match === "[39m") {
					return "</span>";
				}

				if (color = colors[$1]) {
					return "<span style=\"color:" + color + ";\">";
				}

				return "";
			}), // remove colors
			stack: prepareStack(error.stack),
			filemessage: filename ? "<p>The error occurred while processing <strong>" + filename + "</strong>.</p>" : ""
		});

		// turn filepaths into links
		html = html.replace(/([>\s\(])(&#x2F[^\s\):<]+)/g, function (match, $1, $2) {
			return $1 + "<a href=\"/__gobble__" + $2 + "\">" + $2 + "</a>";
		});

		response.statusCode = 500;
		response.write(html);

		response.end();
	}
}

function prepareStack(stack) {
	return stack.split("\n").filter(function (line) {
		return line !== "Error";
	}).map(function (line) {
		return "<li>" + escape(line.trim()) + "</li>";
	}).join("");
}

function escape(str) {
	return (str || "").replace(/[&<>"'\/]/g, function (char) {
		return entities[char];
	});
}