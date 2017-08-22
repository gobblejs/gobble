let SOURCEMAPPING_URL = 'sourceMa';
SOURCEMAPPING_URL += 'ppingURL';

const SOURCEMAP_COMMENT = new RegExp( `\n*(?:` +
	`\\/\\/[@#]\\s*${SOURCEMAPPING_URL}=([^'"]+?)|` +      // js
	`\\/\\*#?\\s*${SOURCEMAPPING_URL}=([^'"]+?)\\s\\+\\/)` + // css
'\\s*($|\n)', 'g' );

function getSourcemapComment ( url, ext ) {
	if ( ext === '.css' ) {
		return `\n/*# ${SOURCEMAPPING_URL}=${url} */\n`;
	}

	return `\n//# ${SOURCEMAPPING_URL}=${url}\n`;
}

export { getSourcemapComment, SOURCEMAP_COMMENT, SOURCEMAPPING_URL };
