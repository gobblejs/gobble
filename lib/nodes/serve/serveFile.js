'use strict';

var mime = require('mime');
var sander = require('sander');



exports['default'] = serveFile;
function serveFile(filepath, request, response) {
	return sander.readFile(filepath).then(function (data) {
		response.statusCode = 200;
		response.setHeader("Content-Type", mime.lookup(filepath));
		response.setHeader("Content-Length", data.length);

		response.write(data);
		response.end();
	});
}