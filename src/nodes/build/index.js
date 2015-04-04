import { resolve } from 'path';
import { copydir, readdir } from 'sander';
import cleanup from '../../utils/cleanup';
import session from '../../session';
import GobbleError from '../../utils/GobbleError';

export default function ( node, options ) {
	if ( !options || !options.dest ) {
		throw new GobbleError({
			code: 'MISSING_DEST_DIR',
			task: 'build'
		});
	}

	const gobbledir = resolve( options.gobbledir || process.env.GOBBLE_TMP_DIR || '.gobble-build' );
	const dest = options.dest;

	// the return value is an EventEmitter...
	const task = session.create({ gobbledir });
	let promise;
	let previousDetails;

	// that does double duty as a promise
	task.then = function () {
		return promise.then.apply( promise, arguments );
	};

	task.catch = function () {
		return promise.catch.apply( promise, arguments );
	};

	promise = cleanup( gobbledir )
		.then( () => {
			return readdir( dest ).then( files => {
				if ( files.length && !options.force ) {
					throw new GobbleError({
						message: `destination folder (${dest}) is not empty`,
						code: 'DIR_NOT_EMPTY',
						path: dest
					});
				}

				return cleanup( dest ).then( build );
			}, build );
		})
		.then( () => {
			task.emit( 'complete' );
			session.destroy();
		})
		.catch( err => {
			task.emit( 'error', err );
			session.destroy();
			throw err;
		});

	return task;

	function build () {
		task.emit( 'info', {
			code: 'BUILD_START'
		});

		node.on( 'info', details => {
			if ( details === previousDetails ) return;
			previousDetails = details;
			task.emit( 'info', details );
		});

		node.start(); // TODO this starts a file watcher! need to start without watching

		return node.ready().then( inputdir => {
			node.stop();
			return copydir( inputdir ).to( dest );
		});
	}
}
