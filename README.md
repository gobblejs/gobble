# gobble

**the last build tool you'll ever need**

Gobble an experimental, work-in-progress, so-far-completely-unusable general-purpose build tool. Basically I'm just squatting on the name. But watch this space.

## Why another build tool?

There's been a huge amount of innovation in build tools recently. A lot of us have moved away from the Grunt Way - of gluing together the various stages of a build process via increasingly-lazily-named temporary folders, re-executing the whole thing whenever source files change - towards smarter systems that understand *dependency graphs*. This means faster, smarter incremental rebuilds. My personal tool of choice is broccoli.

But personally I've been a little frustrated with some of the API choices made by these tools. Here's the thing: for any moderately complex build process, you're inevitably going to have needs that aren't met by existing plugins. Creating your own plugin needs to be effortless, and at the moment it's really, really not.

And even if your needs *are* met by plugins, suddenly you're dependent on an ecosystem built by people who, in many cases, have better things to do than keep their stuff up to date.

Gobble will change all that. You're going to love it. If I can get it to work. Stay tuned.


## Sneak preview

A common build task is to compile some .sass files to .css. For context, here's how you'd write that plugin for existing build tools:

* [grunt-contrib-sass](https://github.com/gruntjs/grunt-contrib-sass/blob/master/tasks/sass.js) - 120 lines
* [grunt-sass](https://github.com/sindresorhus/grunt-sass/blob/master/tasks/sass.js) - 45 lines
* [broccoli-sass](https://github.com/joliss/broccoli-sass/blob/master/index.js) - 53 lines
* [gulp-sass](https://github.com/dlmanning/gulp-sass/blob/master/index.js) - 88 lines

Here's the equivalent plugin for gobble - all 8 lines of it:

```js
module.exports = function compileSass ( srcDir, destDir, options, done ) {
	require( 'node-sass' ).render({
		file: require( 'path' ).join( srcDir, options.src ),
		success: function ( css ) {
			require( 'gobble' ).file.write( destDir, options.dest, css ).then( done );
		}
	});
};
```


## License

MIT Licensed. Copyright 2014 Rich Harris.
