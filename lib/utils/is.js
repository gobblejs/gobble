function isRegExp ( what ) {
  return Object.prototype.toString.call( what ) === '[object RegExp]';
}

module.exports.isRegExp = isRegExp;
