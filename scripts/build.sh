set -e

rm -rf dist
mkdir -p dist

rollupbabel -i src/index.js -o dist/gobble.js -f cjs -m -e path,chalk,sander,chokidar,debounce,promise-map-series,eventemitter2,buffer-crc32,require-relative,util,http,tiny-lr,minimatch,url,mime,graceful-fs
