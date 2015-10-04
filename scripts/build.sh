set -e

rm -rf lib
mkdir -p lib

babel src -m commonStrict --out-dir lib -b useStrict --source-maps-inline --loose es6.classes
