module.exports = function ( src, replacements ) {
	return src.replace( /\$\{([^\}]+)\}/g, function ( match, $1 ) {
		return replacements[ $1 ] || match;
	});
};
