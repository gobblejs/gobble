var uid = 1;

module.exports = function ( postfix ) {
	return pad( uid++ ) + ( postfix ? '-' + postfix : '' );
};

function pad ( number ) {
	return '' + ( number < 10 ? '0' + number : number );
}
