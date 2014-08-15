var file = {
	stat: require( './stat' ),
	readdir: require( './readdir' ),
	read: require( './read' ),
	write: require( './write' ),
	unlink: require( './unlink' ),

	copy: require( './copy' ),
	copydir: require( './copydir' ),
	exists: require( './exists' ),
	ls: require( './ls' ),

	mkdirp: require( './mkdirp' ),
	glob: require( './glob' ),
	rimraf: require( './rimraf' )
};

module.exports = file;
