# Changelog

## 0.6.8

* Fix for ([#18](https://github.com/gobblejs/gobble/issues/18))

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
