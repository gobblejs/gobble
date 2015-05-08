import { copydir, rimraf, Promise } from 'sander';
import cleanup from '../../utils/cleanup';
import session from '../../session';
import GobbleError from '../../utils/GobbleError';
import flattenSourcemaps from '../../utils/flattenSourcemaps';

export default function watch ( node, options ) {
	if ( !options || !options.dest ) {
		throw new GobbleError({
			code: 'MISSING_DEST_DIR',
			task: 'watch'
		});
	}

	const gobbledir = require( 'path' ).resolve( options.gobbledir || process.env.GOBBLE_TMP_DIR || '.gobble-watch' );
	const task = session.create({ gobbledir });

	let watchTask;

	task.resume = n => {
		node = n;
		watchTask = node.createWatchTask();

		watchTask.on( 'info', details => task.emit( 'info', details ) );
		watchTask.on( 'error', err => task.emit( 'error', err ) );

		let buildStart;
		watchTask.on( 'build:start', () => buildStart = Date.now() );

		watchTask.on( 'build:end', dir => {
			const dest = options.dest;

			rimraf( dest )
				.then( () => copydir( dir ).to( dest ) )
				.then( () => {
					const sourcemapProcessStart = Date.now();

					task.emit( 'info', {
						code: 'SOURCEMAP_PROCESS_START',
						progressIndicator: true
					});

					return flattenSourcemaps( dir, dest, dest, task ).then( () => {
						task.emit( 'info', {
							code: 'SOURCEMAP_PROCESS_COMPLETE',
							duration: Date.now() - sourcemapProcessStart
						});

						task.emit( 'info', {
							code: 'BUILD_COMPLETE',
							duration: Date.now() - buildStart,
							watch: true
						});
					});
				})
				.then( () => task.emit( 'built', dest ) )
				.catch( err => task.emit( 'error', err ) );
		});
	};

	task.close = () => {
		watchTask.close();
		session.destroy();

		return Promise.resolve(); // for consistency with serve task
	};

	task.pause = () => {
		if ( watchTask ) {
			watchTask.close();
		}

		watchTask = null;
		return cleanup( gobbledir );
	};

	cleanup( gobbledir ).then(
		() => task.resume( node ),
		err => task.emit( 'error', err )
	);

	return task;
}
