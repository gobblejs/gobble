# Changelog

## 0.10.2

* sourceMappingURLs that begin with `data` are not assumed to be data URIs

## 0.10.1

* CSS sourcemaps are flattened correctly

## 0.10.0

* Sourcemaps persist across non-sourcemap-generating transform boundaries ([#63](https://github.com/gobblejs/gobble/issues/63))
* Internal tidy up

## 0.9.3

* Sourcemap flattening happens in a separate final directory - fixes ([#63](https://github.com/gobblejs/gobble/issues/63))
* Sourcemap flattening only applies to `.js` and `.css` files ([#64](https://github.com/gobblejs/gobble/issues/64))

## 0.9.2

* Unwanted `sourceMappingURL` comments are always removed from file transformer output (maps are handled by gobble) ([#58](https://github.com/gobblejs/gobble/issues/58))

## 0.9.1

* Prevent build from hanging ([#56](https://github.com/gobblejs/gobble/issues/56))

## 0.9.0

* BREAKING: the `.grab()` and `.moveTo()` methods take a single path (previously, they would accept multiple strings, which would be joined with `path.join()`) ([#53](https://github.com/gobblejs/gobble/issues/53))
* The `.grab()`, `.moveTo()`, `.include()` and `.exclude()` builtin transformers accept an optional second argument, which can have an `id` property which is used for debugging

## 0.8.1

* Added missing source-map-support dependency
* Missing sourcemaps do not fail the build
* Fix regression when building (failure to propagate information)

## 0.8.0

* Sourcemaps from multiple steps are 'flattened' automatically using [sorcery](https://github.com/Rich-Harris/sorcery) ([#22](https://github.com/gobblejs/gobble/issues/22))

## 0.7.15

* Implement `node.observe()`, `node.observeIf()` and `node.transformIf()` ([#44](https://github.com/gobblejs/gobble/issues/44))
* Handle files with spaces when creating sourcemaps ([#47](https://github.com/gobblejs/gobble/issues/47))

## 0.7.14

* Cached transforms can be reused regardless of sourcemaps ([#46](https://github.com/gobblejs/gobble/issues/46))

## 0.7.13

* Fix regression introduced in 0.7.12

## 0.7.12

* Inline sourcemaps from file transformers are fixed ([#45](https://github.com/gobblejs/gobble/issues/45))

## 0.7.11

* More robust invalidation ([#42](https://github.com/gobblejs/gobble/issues/42))
* `inputdir` and `outputdir` are added to the error object on transformation failure
* File watcher errors are not handled
* Removed generated `lib/` directory from repo
* Internal tidy up

## 0.7.10

* Prevent source changes during file transformations causing transformer promise to never resolve ([#41](https://github.com/gobblejs/gobble/issues/41))
* File transforms can specify their encoding with the `sourceEncoding` option ([#40](https://github.com/gobblejs/gobble/pull/40))

## 0.7.9

* Prevent map transforms generating phantom sourcemaps on incremental builds ([#39](https://github.com/gobblejs/gobble/issues/39))

## 0.7.8

* Auto-generated sourcemaps have the correct `sourcesContent`

## 0.7.7

* Auto-generated sourcemap names are deconflicted ([#38](https://github.com/gobblejs/gobble/issues/38))

## 0.7.6

* Fixes a regression in 0.7.5 whereby directories with the same name would not be merged correctly (later directories would overwrite earlier ones)

## 0.7.5

* The `accept` and `ext` options are deleted from the options object passed through to map transformers ([#36](https://github.com/gobblejs/gobble/issues/36))

## 0.7.4

* Stack traces are preserved when errors are thrown inside transformations

## 0.7.3

* Auto-generated sourceMappingURLs are always absolute ([#33](https://github.com/gobblejs/gobble/issues/33))

## 0.7.2

* You can now gobble a single file (`node = gobble('myFile.txt')`) ([#23](https://github.com/gobblejs/gobble/issues/23))
* Transformer context includes `env` property and a `log` method ([#24](https://github.com/gobblejs/gobble/issues/24))
* The `accept` option of a file transformer can include regexes as well as file extension strings
* [sander](https://github.com/rich-harris/sander) is exposed as `gobble.sander`, for convenience
* Duplicate messages are squelched ([gobble-cli/#6](https://github.com/gobblejs/gobble-cli/issues/6))
* Minor bugfixes


## 0.7.1

* Errors are augmented with `file`, `line` and `column` properties where possible, for smarter debugging

## 0.7.0

* Add `node.watch()` method, for building to a specific folder and keeping it updated as files change
* Task `info` events are fired with objects with message codes, rather than strings. [Consult the wiki](https://github.com/gobblejs/gobble/wiki/Events) for a list of message codes
* Internal refactoring

## 0.6.11

* The `GOBBLE_ENV` and `GOBBLE_CWD` environment variables can be set with e.g. `gobble.env('test')` and `gobble.cwd(__dirname)` respectively (`gobble.env()`/`gobble.cwd()` without arguments retrieves the current value)
* Fixes edge case whereby source nodes would be incorrectly shared between trees
* Better error handling with file transformers
* File transformers can return an object with a missing (or falsy) `map` property

## 0.6.10

* Upgrade sander module to version that uses graceful-fs, to prevent EMFILE errors

## 0.6.9

* If a source node is used more than once, changes will only trigger one rebuild ([#19](https://github.com/gobblejs/gobble/issues/19))
* Merge operations can be aborted mid-flight, to prevent unnecessary work

## 0.6.8

* Fix for ([#19](https://github.com/gobblejs/gobble/issues/19))

## 0.6.7

* Nodes clean up after themselves on each successful build, to avoid lengthy subsequent startup times ([#16](https://github.com/gobblejs/gobble/issues/16))

## 0.6.6

* Serve task emits `build` event on each successful build
* Files are given the correct extension by the map transformation if their inputs are unchanged ([#14](https://github.com/gobblejs/gobble/issues/14))
* The `ready` event is only emitted by the serve task when the server is listening *and* the first build is complete

## 0.6.5

* Fix names of sourcemaps in subdirectories

## 0.6.4

* Reinstate CRC comparisons, for fast one-to-one transformations (unchanged files are not transformed again)
* Implement `node.stop()`, for cleaning up after finishing serving or restarting a server

## 0.6.3

* Internal refactoring

## 0.6.2

* `gobble('dir')` will throw an error if the `dir` directory doesn't exist ([#12](https://github.com/gobblejs/gobble/issues/12))

## 0.6.1

* Fixed bug introduced in 0.6.0, whereby `.cache` directories were inadvertently destroyed on cleanup

## 0.6.0

* Started maintaining a changelog
* Plugin API changed - transformers take a single callback (rather than callback/errback) or return a Promise ([#5](https://github.com/gobblejs/gobble/issues/5))
* Map transforms can return a string, or an object with a `code` property (containing the transformed contents) and an optional `map` property (containing a valid sourcemap) ([#6](https://github.com/gobblejs/gobble/issues/6))
* Build tasks default to a different gobbledir to serve tasks (`.gobble-build` instead of `.gobble`), so a project can be served and built simultaneously ([#7](https://github.com/gobblejs/gobble/issues/7))
* `gobble.file()` is no longer exposed - plugins should use `fs` or, if necessary, an alternative filesystem utility such as [sander](https://github.com/rich-harris/sander) (which gobble uses internally)
