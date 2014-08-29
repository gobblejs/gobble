# example project

This folder contains the example from [How to write a gobblefile](https://github.com/gobblejs/gobble/wiki/How-to-write-a-gobblefile).

To try it, you'll need to have cloned this repo and set it up:

```bash
git clone https://github.com/gobblejs/gobble
cd gobble
npm install
```

Once you're up and running, `cd` into this folder and install gobble...

```bash
cd example
npm install   # will install gobble, because it's specified in package.json
```

...and kick off the build:

```bash
gobble
```

The project will be served on [localhost:4567](http://localhost:4567). Click on the turkey! Try changing the source files - the project will rebuild immediately. If you have the [LiveReload](https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei) extension for Chrome, your browser will be refreshed once the build completes.

Updating the gobblefile itself will also cause a rebuild, as long as the server is running.


## Dependencies

This gobblefile specifies two plugin dependencies - `sass` and `es6-transpiler`. This is shorthand for `require('gobble-sass')` and `require('es6-transpiler')` - if those dependencies aren't yet installed, Gobble will offer to install them for you.
