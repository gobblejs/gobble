module.exports = function () {
	return require( 'path' ).resolve( process.env.GOBBLE_TMP_DIR || '.gobble' );
};
