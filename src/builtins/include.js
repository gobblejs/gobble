import { readdir, stat } from 'graceful-fs';
import { dirname, sep } from 'path';
import { mkdirSync } from 'sander';
import *  as minimatch from 'minimatch';
import { sync as symlinkOrCopy } from 'symlink-or-copy';

export default function include ( inputdir, outputdir, options, callback ) {
	var numPatterns = options.patterns.length;

	function processdir ( dir, cb ) {
		readdir( dir, function ( err, files ) {
			var remaining = files.length, result = [], check;

			if ( err ) return cb( err );

			// Empty dir?
			if ( !remaining ) {
				cb( null, result );
			}

			check = function () {
				if ( !--remaining ) {
					cb( null, result );
				}
			};

			files.forEach( function ( filename ) {
				var filepath, destpath, include;

				filepath = dir + sep + filename;

				include = matches( filepath.replace( inputdir + sep, '' ) );

				destpath = filepath.replace( inputdir, outputdir );

				stat( filepath, function ( err, stats ) {
					if ( err ) return cb( err );

					if ( stats.isDirectory() ) {
						processdir( filepath, handleResult );
					} else {
						if ( options.exclude && include || !options.exclude && !include ) {
							return check();
						}

						mkdirSync( dirname( destpath ) );

						try {
							symlinkOrCopy( filepath, destpath );
							check();
						} catch ( e ) {
							cb( e );
						}
					}
				});
			});

			function handleResult ( err ) {
				if ( err ) return cb( err );
				check();
			}
		});
	}

	function matches ( filename ) {
		var i = numPatterns;
		while ( i-- ) {
			if ( minimatch( filename, options.patterns[i] ) ) {
				return true;
			}
		}

		return false;
	}

	processdir( inputdir, callback );
}
