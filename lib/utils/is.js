'use strict';

exports.isRegExp = isRegExp;

function isRegExp(what) {
  return Object.prototype.toString.call(what) === "[object RegExp]";
}