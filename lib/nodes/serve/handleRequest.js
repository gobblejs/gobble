'use strict';

var path = require('path');
var url = require('url');
var sander = require('sander');
var serveFile = require('./serveFile');
var serveDir = require('./serveDir');
var serveError = require('./serveError');



exports['default'] = handleRequest;
function handleRequest(srcDir, error, request, response) {
	var message,
	    parsedUrl = url.parse(request.url),
	    pathname = parsedUrl.pathname,
	    filepath;

	if (error) {
		if (pathname.substr(0, 11) === "/__gobble__") {
			message = error.original && error.original.message || error.message || "";
			filepath = pathname.substring(11);

			// only allow links to files that we're actually interested in, not
			// the whole damn filesystem
			if (~message.indexOf(filepath) || ~error.stack.indexOf(filepath)) {
				return serveFile['default'](pathname.substring(11), request, response);
			}
		}

		serveError['default'](error, request, response);
		return sander.Promise.resolve();
	}

	filepath = path.join(srcDir, pathname);

	return sander.stat(filepath).then(function (stats) {
		if (stats.isDirectory()) {
			// might need to redirect from `foo` to `foo/`
			if (pathname.slice(-1) !== "/") {
				response.setHeader("Location", pathname + "/" + (parsedUrl.search || ""));
				response.writeHead(301);

				response.end();
			} else {
				return serveDir['default'](filepath, request, response);
			}
		} else {
			return serveFile['default'](filepath, request, response);
		}
	}, function (err) {
		return serveError['default'](err, request, response);
	});
}