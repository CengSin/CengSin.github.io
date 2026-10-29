#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
python3 "$root/site/src/check_comments.py" --self-test
python3 "$root/site/src/check_comments.py" --check "$root/site/src"
node "$root/site/cloudflare/build-assets.mjs"
node --test "$root"/site/cloudflare/*.test.mjs
