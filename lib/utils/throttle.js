module.exports = function throttle ( fn, ms ) {
	var timeout;

	return function () {
		if ( !timeout ) {
			timeout = setTimeout( function () {
				timeout = null;
				fn();
			}, ms || 200 );
		}
	};
};
