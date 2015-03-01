'use strict';

var path = require('path');
var crc32 = require('buffer-crc32');
var Queue = require('../queue/Queue');
var sander = require('sander');
var linkFile = require('../file/link');
var assign = require('../utils/assign');
var config = require('../config');
var compareBuffers = require('../utils/compareBuffers');
var extractLocationInfo = require('../utils/extractLocationInfo');
var is = require('../utils/is');



exports['default'] = map;

function map(inputdir, outputdir, options) {
	var transformation = this;

	return new sander.Promise(function (fulfil, reject) {
		var queue = new Queue['default']();

		queue.once("error", reject);

		sander.lsr(inputdir).then(function (files) {
			var promises = files.map(function (filename) {
				var ext = path.extname(filename),
				    srcpath,
				    destpath,
				    destname,
				    mapdest;

				destname = options.ext && ~options.accept.indexOf(ext) ? filename.substr(0, filename.length - ext.length) + options.ext : filename;

				srcpath = path.join(inputdir, filename);
				destpath = path.join(outputdir, destname);

				mapdest = destpath + ".map";

				// If this mapper only accepts certain extensions, and this isn't
				// one of them, just copy the file
				if (skip(options, ext, filename)) {
					return sander.link(srcpath).to(destpath);
				}

				return sander.stat(srcpath).then(function (stats) {
					if (stats.isDirectory()) {
						return;
					}

					return sander.readFile(srcpath).then(function (data) {
						var crc, previous, promises;

						if (transformation.aborted) {
							return;
						}

						// If the file contents haven't changed, we have nothing to do except
						// copy the last successful transformation
						crc = crc32(data);
						previous = options.cache[filename];

						if (previous && compareBuffers['default'](crc, previous.crc)) {
							// if there's no sourcemap involved, we can just copy
							// the previously generated code
							if (!previous.mapdest) {
								return sander.link(previous.codepath).to(destpath);
							}

							// otherwise, we need to write a new file with the correct
							// sourceMappingURL. (TODO is this really the best way?
							// What if sourcemaps had their own parallel situation? What
							// if the sourcemap itself has changed? Need to investigate
							// when I'm less pressed for time)
							return sander.readFile(previous.codepath).then(String).then(function (code) {
								// remove any existing sourcemap comment
								code = code.replace(/\/\/#\s*sourceMappingURL=[^\s]+/, "") + "\n//# sourceMappingURL=" + mapdest;

								return sander.Promise.all([sander.writeFile(destpath, code), sander.link(previous.mapdest).to(mapdest)]);
							});
						}

						return queue.add(function (fulfil, reject) {
							var result, filepath, creator, message, err, context, cacheobj, code, sourcemap, loc;

							// Create context object - this will be passed to transformers
							context = {
								src: srcpath,
								dest: path.join(outputdir, destname),
								filename: filename,
								mapdest: mapdest,
								log: transformation.log,
								env: config['default'].env
							};

							try {
								result = options.fn.call(context, data.toString(), assign['default']({}, options.fn.defaults, options.userOptions));
							} catch (e) {
								if (typeof e === "string") {
									err = new Error(e);
								} else {
									err = e;
								}

								filepath = inputdir + path.sep + filename;
								message = "An error occurred while processing " + filepath.magenta;

								if (creator = transformation.node.input._findCreator(filename)) {
									message += " (this file was created by the " + creator.id + " transformation)";
								}

								loc = extractLocationInfo['default'](err);

								err.file = srcpath;
								err.line = loc.line;
								err.column = loc.column;

								return reject(err);
							}

							cacheobj = {
								crc: crc,
								codepath: path.resolve(transformation.cachedir, destname)
							};

							if (typeof result === "object" && result.code) {
								code = result.code;
								sourcemap = processMap(result.map);
							} else {
								code = result;
							}

							promises = [writeCode()];

							if (sourcemap) {
								cacheobj.mapdest = path.resolve(transformation.cachedir, path.basename(mapdest));
								promises.push(writeMap());
							}

							sander.Promise.all(promises).then(function () {
								options.cache[filename] = cacheobj;
							}).then(fulfil, reject);

							function processMap(map) {
								if (typeof map === "string") {
									map = JSON.parse(map);
								}

								if (!map) {
									return null;
								}

								map.sources = [srcpath];
								map.sourcesContent = [data.toString()];
								return JSON.stringify(map);
							}

							function writeCode() {
								if (sourcemap) {
									// remove any existing sourcemap comment
									code = code.replace(/\/\/#\s*sourceMappingURL=[^\s]+/, "");
									code += "\n//# sourceMappingURL=" + mapdest;
								}

								return sander.writeFile(cacheobj.codepath, code).then(function () {
									// TODO use sander.link?
									return linkFile['default'](cacheobj.codepath).to(context.dest);
								});
							}

							function writeMap() {
								return sander.writeFile(cacheobj.mapdest, sourcemap).then(function () {
									return linkFile['default'](cacheobj.mapdest).to(mapdest);
								});
							}
						})["catch"](function (err) {
							queue.abort();
							throw err;
						});
					});
				});
			});

			return sander.Promise.all(promises);
		}).then(function () {
			queue.off("error", reject);
			fulfil();
		}, reject);
	});
}

function skip(options, ext, filename) {
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