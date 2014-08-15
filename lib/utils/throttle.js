module.exports = function throttle ( fn, ms ) {
	var timeout;

	return function () {
		var context = this, args = [], i = arguments.length;

		while ( i-- ) {
			args[i] = arguments[i];
		}

		if ( !timeout ) {
			timeout = setTimeout( function () {
				timeout = null;
				fn.apply( context, args );
			}, ms || 200 );
		}
	};
};
