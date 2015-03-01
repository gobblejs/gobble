const toString = Object.prototype.toString;

export function isRegExp ( what ) {
	return toString.call( what ) === '[object RegExp]';
}

export function isArray( thing ) {
	return toString.call( thing ) === '[object Array]';
}

export function isString ( thing ) {
	return typeof thing === 'string';
}
