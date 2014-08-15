var file = {
	stat: require( './stat' ),
	readdir: require( './readdir' ),
	read: require( './read' ),
	write: require( './write' ),
	unlink: require( './unlink' ),

	copy: require( './copy' ),
	exists: require( './exists' ),
	ls: require( './ls' ),

	mkdirp: require( './mkdirp' ),
	glob: require( './glob' )
};

module.exports = file;
