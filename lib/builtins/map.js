'use strict';

var path = require('path');
var chalk = require('chalk');
var Queue = require('../queue/Queue');
var sander = require('sander');
var linkFile = require('../file/link');
var assign = require('../utils/assign');
var config = require('../config');
var extractLocationInfo = require('../utils/extractLocationInfo');
var is = require('../utils/is');



exports['default'] = map;

var SOURCEMAP_COMMENT = /\/\/#\s*sourceMappingURL=[^\s]+/;
function map(inputdir, outputdir, options) {
	var _this = this;

	var changed = {};
	this.changes.forEach(function (change) {
		if (!change.removed) {
			changed[change.file] = true;
		}
	});

	return new sander.Promise(function (fulfil, reject) {
		var queue = new Queue['default']();

		queue.once("error", reject);

		sander.lsr(inputdir).then(function (files) {
			var promises = files.map(function (filename) {
				var ext = path.extname(filename),
				    src,
				    dest,
				    destname;

				if (_this.aborted) return;

				// change extension if necessary, e.g. foo.coffee -> foo.js
				destname = options.ext && ~options.accept.indexOf(ext) ? filename.substr(0, filename.length - ext.length) + options.ext : filename;

				src = path.join(inputdir, filename);
				dest = path.join(outputdir, destname);

				// If this mapper only accepts certain extensions, and this isn't
				// one of them, just copy the file
				if (shouldSkip(options, ext, filename)) {
					return sander.link(src).to(dest);
				}

				// If this file *does* fall within this transformer's remit, but
				// hasn't changed, we just copy the cached file
				if (!changed[filename] && options.cache.hasOwnProperty(filename)) {
					return useCachedTransformation(_this.node, options.cache[filename], dest);
				}

				// Otherwise, we queue up a transformation
				return queue.add(function (fulfil, reject) {
					// Create context object - this will be passed to transformers
					var context = {
						log: _this.log,
						env: config['default'].env,
						src: src, dest: dest, filename: filename
					};

					var transformOptions = assign['default']({}, options.fn.defaults, options.userOptions);

					delete transformOptions.accept;
					delete transformOptions.ext;

					return sander.readFile(src).then(function (buffer) {
						return buffer.toString(transformOptions.sourceEncoding);
					}).then(function (data) {
						var result, code, map, mappath;

						if (_this.aborted) return;

						try {
							result = options.fn.call(context, data, transformOptions);
						} catch (e) {
							var err = createTransformError(e, src, filename, _this.node);
							return reject(err);
						}

						var codepath = path.resolve(_this.cachedir, filename);

						if (typeof result === "object" && result.code) {
							code = result.code;
							map = processSourcemap(result.map, src, dest, data);
							mappath = "" + codepath + "." + _this.node.id + ".map";
						} else {
							code = result;
						}

						writeTransformedResult(_this.node, code, map, codepath, mappath, dest).then(function () {
							return options.cache[filename] = { codepath: codepath, mappath: mappath };
						}).then(fulfil)["catch"](reject);
					});
				})["catch"](function (err) {
					queue.abort();
					throw err;
				});
			});

			return sander.Promise.all(promises);
		}).then(function () {
			queue.off("error", reject);
			fulfil();
		}, reject);
	});
}

function useCachedTransformation(node, cached, dest) {
	// if there's no sourcemap involved, we can just copy
	// the previously generated code
	if (!cached.mappath) {
		return sander.link(cached.codepath).to(dest);
	}

	// otherwise, we need to write a new file with the correct
	// sourceMappingURL. (TODO is this really the best way?
	// What if sourcemaps had their own parallel situation? What
	// if the sourcemap itself has changed? Need to investigate
	// when I'm less pressed for time)
	return sander.readFile(cached.codepath).then(String).then(function (code) {
		// remove any existing sourcemap comment
		code = code.replace(SOURCEMAP_COMMENT, "") + ("\n//# sourceMappingURL=" + dest + "." + node.id + ".map");

		return sander.Promise.all([sander.writeFile(dest, code), sander.link(cached.mappath).to("" + dest + "." + node.id + ".map")]);
	});
}

function writeTransformedResult(node, code, map, codepath, mappath, dest) {
	if (!map) {
		return writeCode();
	}

	// remove any existing sourcemap comment
	code = code.replace(SOURCEMAP_COMMENT, "");
	code += "\n//# sourceMappingURL=" + dest + "." + node.id + ".map";

	return sander.Promise.all([writeCode(), sander.writeFile(mappath, map).then(function () {
		return linkFile['default'](mappath).to("" + dest + "." + node.id + ".map");
	})]);

	function writeCode() {
		return sander.writeFile(codepath, code).then(function () {
			// TODO use sander.link?
			return linkFile['default'](codepath).to(dest);
		});
	}
}

function createTransformError(original, src, filename, node) {
	var err = typeof original === "string" ? new Error(original) : original;

	var message = "An error occurred while processing " + chalk.magenta(src);

	var creator = undefined;

	if (creator = node.input._findCreator(filename)) {
		message += " (this file was created by the " + creator.id + " transformation)";
	}

	var _extractLocationInfo = extractLocationInfo['default'](err);

	var line = _extractLocationInfo.line;
	var column = _extractLocationInfo.column;

	err.file = src;
	err.line = line;
	err.column = column;

	return err;
}

function processSourcemap(map, src, dest, data) {
	if (typeof map === "string") {
		map = JSON.parse(map);
	}

	if (!map) {
		return null;
	}

	map.file = dest;
	map.sources = [src];
	map.sourcesContent = [data];
	return JSON.stringify(map);
}

function shouldSkip(options, ext, filename) {
	var filter, i, flt;

	if (filter = options.accept) {
		for (i = 0; i < filter.length; i++) {
			flt = filter[i];

			if (typeof flt === "string" && flt === ext) {
				return false;
			} else if (is.isRegExp(flt) && flt.test(filename)) {
				return false;
			}
		}

		return true;
	}

	return false;
}