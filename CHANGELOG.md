# Changelog

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
