# Changelog

## 0.6.0

* Started maintaining a changelog
* Plugin API changed - transformers take a single callback (rather than callback/errback) or return a Promise ([#5](https://github.com/gobblejs/gobble/issues/5))
* Map transforms can return a string, or an object with a `code` property (containing the transformed contents) and an optional `map` property (containing a valid sourcemap) ([#6](https://github.com/gobblejs/gobble/issues/6))
