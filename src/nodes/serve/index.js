import { createServer } from 'http';
import { resolve } from 'path';
import { Promise } from 'sander';
import * as tinyLr from 'tiny-lr';
import cleanup from '../../utils/cleanup';
import session from '../../session';
import config from '../../config';
import GobbleError from '../../utils/GobbleError';
import handleRequest from './handleRequest';

export default function serve ( node, options = {} ) {
	const port = options.port || 4567;
	const gobbledir = resolve( options.gobbledir || process.env.GOBBLE_TMP_DIR || '.gobble' );
	const task = session.create({ gobbledir });

	let buildStarted = Date.now();
	let watchTask;
	let srcDir;
	let server;
	let serverReady;
	let lrServer;
	let lrServerReady;
	let built = false;
	let firedReadyEvent = false;
	let error = { gobble: 'WAITING' };

	task.resume = n => {
		node = n;
		watchTask = node.createWatchTask( config.cwd );

		watchTask.on( 'info', details => task.emit( 'info', details ) );

		watchTask.on( 'error', err => {
			error = err;
			task.emit( 'error', err );
		});

		watchTask.on( 'built', d => {
			error = null;
			srcDir = d;

			built = true;

			task.emit( 'built' );

			if ( !firedReadyEvent && serverReady ) {
				task.emit( 'ready' );
				firedReadyEvent = true;
			}

			if ( !lrServerReady ) {
				return;
			}

			lrServer.changed({ body: { files: '*' } });
		});
	};

	task.close = () => {
		if ( node ) {
			node.stop();
		}

		return new Promise( fulfil => {
			session.destroy();
			server.removeAllListeners();
			server.close( fulfil );
		});
	};

	task.pause = () => {
		error = { gobble: 'WAITING' };

		buildStarted = Date.now();

		if ( node ) {
			node.stop();
		}

		node = null;

		return cleanup( gobbledir );
	};

	server = createServer();

	server.on( 'error', err => {
		if ( err.code === 'EADDRINUSE' ) {
			// We need to create our own error, so we can pass along port info
			err = new GobbleError({
				port,
				code: 'PORT_IN_USE',
				message: `port ${port} is already in use`
			});
		}

		task.emit( 'error', err );

		process.exit( 1 );
	});

	server.listen( port, () => {
		serverReady = true;

		if ( !firedReadyEvent && built ) {
			task.emit( 'ready' );
			firedReadyEvent = true;
		}

		task.emit( 'info', {
			port,
			code: 'SERVER_LISTENING'
		});
	});

	server.on( 'request', ( request, response ) => {
		handleRequest( srcDir, error, request, response )
			.catch( err => task.emit( 'error', err ) );
	});

	lrServer = tinyLr();
	lrServer.error = err => {
		if ( err.code === 'EADDRINUSE' ) {
			task.emit( 'warning', 'a livereload server is already running (perhaps in a separate gobble process?). Livereload will not be available for this session' );
		} else {
			task.emit( 'error', err );
		}
	};

	lrServer.listen( 35729, () => {
		lrServerReady = true;
		task.emit( 'info', {
			code: 'LIVERELOAD_RUNNING'
		});
	});


	cleanup( gobbledir ).then(
		() => task.resume( node ),
		err => task.emit( 'error', err )
	);

	return task;
}
