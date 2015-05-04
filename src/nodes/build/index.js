import { resolve } from 'path';
import { copydir, lsr ,readdir, Promise } from 'sander';
import * as sorcery from 'sorcery';
import cleanup from '../../utils/cleanup';
import session from '../../session';
import GobbleError from '../../utils/GobbleError';
import flattenSourcemaps from '../../utils/flattenSourcemaps';

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

	function build () {
		task.emit( 'info', {
			code: 'BUILD_START'
		});
		node.start();

		node.on( 'info', details => {
			if ( details === previousDetails ) return;
			previousDetails = details;
			task.emit( 'info', details );
		});

		return node.ready()
			.then( inputdir => {
				return copydir( inputdir ).to( dest )
					.then( () => flattenSourcemaps( inputdir, dest, dest, node, task ) );
			})
			.then( () => node.stop() ); // TODO should not need to stop...
	}

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
		.then(
			() => {
				task.emit( 'complete' );
				session.destroy();
			},
			err => {
				session.destroy();
				task.emit( 'error', err );
				throw err;
			}
		);

	// that does double duty as a promise
	task.then = function () {
		return promise.then.apply( promise, arguments );
	};

	task.catch = function () {
		return promise.catch.apply( promise, arguments );
	};

	return task;
}
