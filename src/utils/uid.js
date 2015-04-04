let i = 1;

export default function uid ( postfix ) {
	if ( process.env.GOBBLE_RESET_UID === 'reset' ) {
		i = 1;
		delete process.env.GOBBLE_RESET_UID;
	}

	return pad( i++ ) + ( postfix ? `-${postfix}` : '' );
}

function pad ( number ) {
	return '' + ( number < 10 ? '0' + number : number );
}
