var flagPattern = /^--([\w-]+)/,
	shortFlagPattern = /^-([\w]+)/;

module.exports = function ( aliases ) {
	var rawArgs, arg, args = [], options = {};

	rawArgs = process.argv.slice( 2 );

	function readOption () {
		if ( !rawArgs[0] || rawArgs[0].charAt( 0 ) === '-' ) {
			return true;
		}

		return rawArgs.shift();
	}

	while ( arg = rawArgs.shift() ) {
		if ( shortFlagPattern.test( arg ) ) {
			arg.substring( 1 ).split( '' ).forEach( function ( flag ) {
				options[ aliases[ flag ] || flag ] = readOption();
			});
		}

		else if ( flagPattern.test( arg ) ) {
			options[ camelize( arg.substring( 2 ) ) ] = readOption();
		}

		else {
			args.push( arg );
		}
	}

	return {
		args: args,
		options: options
	};
};

function camelize ( str ) {
	return str.replace( /-(\w)/g, function ( match, $1 ) {
		return $1.toUpperCase();
	});
}
