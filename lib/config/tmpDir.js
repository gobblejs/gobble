module.exports = function () {
	return require( 'path' ).resolve( process.cwd(), process.env.GOBBLE_TMP_DIR || '.gobble' );
};
