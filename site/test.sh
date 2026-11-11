#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
python3 "$root/site/src/check_comments.py" --self-test
python3 "$root/site/src/check_comments.py" --check "$root/site/src"
python3 - "$root/site/src" <<'PY'
import sys
sys.path.insert(0, sys.argv[1])
import content_store
content_store.load_site()
content_store.load_projects()
content_store.load_bookshop()
print("content ok")
PY
