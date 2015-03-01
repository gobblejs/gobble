import { Promise } from 'sander';
import dir from './dir';
import err from './err';
import notfound from './notfound';
import waiting from './waiting';

export default {
	dir: make( dir ),
	err: make( err ),
	notfound: make( notfound ),
	waiting: make( waiting )
};

function make( template ) {
	return Promise.resolve( function ( data ) {
		return template.replace( /\$\{([^\}]+)\}/g, function ( match, $1 ) {
			return data.hasOwnProperty( $1 ) ? data[ $1 ] : match;
		});
	});
}
