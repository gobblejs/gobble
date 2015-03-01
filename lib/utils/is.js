'use strict';

exports.isRegExp = isRegExp;
exports.isArray = isArray;
exports.isString = isString;

var toString = Object.prototype.toString;
function isRegExp(what) {
	return toString.call(what) === "[object RegExp]";
}

function isArray(thing) {
	return toString.call(thing) === "[object Array]";
}

function isString(thing) {
	return typeof thing === "string";
}