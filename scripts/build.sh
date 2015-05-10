#!/bin/sh

set -e

rm -rf lib

echo "babel..."
babel src --out-dir .babel -b es6.modules,useStrict --source-maps-inline --loose es6.classes > /dev/null

echo "esperanto..."
esperanto -i .babel -o .esperanto -m inline -t cjs -s

echo "sorcery"
sorcery -i .esperanto -o lib

rm -rf .babel
rm -rf .esperanto