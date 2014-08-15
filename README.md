# gobble

**the last build tool you'll ever need**

Gobble an experimental, work-in-progress, so-far-completely-unusable general-purpose build tool. Basically I'm just squatting on the name. But watch this space.

## Why another build tool?

There's been a huge amount of innovation in build tools recently. A lot of us have moved away from the Grunt Way - of gluing together the various stages of a build process via increasingly-lazily-named temporary folders, re-executing the whole thing whenever source files change - towards smarter systems that understand *dependency graphs*. This means faster, smarter incremental rebuilds. My personal tool of choice is broccoli.

But personally I've been a little frustrated with some of the API choices made by these tools. Here's the thing: for any moderately complex build process, you're inevitably going to have needs that aren't met by existing plugins. Creating your own plugin needs to be effortless, and at the moment it's really, really not.

And even if your needs *are* met by plugins, suddenly you're dependent on an ecosystem built by people who, in many cases, have better things to do than keep their stuff up to date.

Gobble will change all that. You're going to love it. If I can get it to work. Stay tuned.


## Installation

*Here be dragons! This is work-in-progress software. If you want to try it out anyway, here's how.*

Install gobble globally (this makes it available as a command line tool):

```bash
npm i -g gobble
```

Then, within your project, install gobble locally

```bash
cd path/to/myproject
npm i -D gobble      # -D is short for --save-dev
```

Once you've installed everything and set up your project, run gobble from the command line - this will serve your project to [localhost:4567](http://localhost:4567) and keep it updated as the source files change:

```bash
gobble
```


## Usage

Your project should have a **gobblefile.js**:

```js
var gobble = require( 'gobble' ),
    concat = require( 'gobble-concat' ),
    uglify = require( 'gobble-uglify' );

var src = gobble( 'src' );

module.exports = gobble([
  src.include( '**/*.js' ).transform( concat, { dest: 'min.js' }).transform( uglify ),
  src.exclude( '**/*.js' )
]);
```

### tree = gobble( 'foo' )

Returns a tree object representing the contents of the 'foo' directory.

### tree = gobble([ tree1, tree2[, ...treeN] ])

Returns the result of merging the input trees. Later files overwrite earlier ones.

### tree2 = tree1.transform( transformer, options )

Returns a tree that is the result of applying `transformer` to `tree1`. The `transformer` function takes four arguments - `inputDir`, `outputDir`, `options`, and `done`:

* `inputDir` - the folder to read files from
* `outputDir` - the folder to write files to
* `options` - the options passed into the `transform` method
* `done` - a function that you must call once you've finished writing files. If an error occurs, call `done(error)`, otherwise pass no arguments.

Asynchronous operations are preferred. `gobble.file` contains a bunch of useful filesystem helpers that return promises, which help deal with node callback hell.

### tree.export( 'dest'[, options] )

Sometimes it's useful, for debugging purposes, to export part of your build in order to inspect it. This method will continuously write the contents of `tree` to `'dest'` whenever they change, as long as gobble is running. It returns `this`, so it doesn't affect the build in any way - it's just a convenient way to see what's going on.


## Built-in transforms

There are a handful of built-in transforms:

### tree.include( pattern )

Filters out any files that don't match `pattern`.

### tree.exclude( pattern )

Opposite of `tree.include(pattern)`.

### tree.map( fn[, options] )

For one-to-one replacements (e.g. transpiling coffeescript). `fn` is a function that takes two arguments - `content` and `options`, where `content` is the contents of the file to process, and `options` is the options argument passed into `map`. The function must return the replacement content.


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
