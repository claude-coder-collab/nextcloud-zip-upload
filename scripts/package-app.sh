#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

APP_ID=zip_upload
VERSION=$(sed -n 's/.*<version>\(.*\)<\/version>.*/\1/p' appinfo/info.xml)

if [ ! -d js ]; then
    echo "js/ not found - run 'npm run build' first" >&2
    exit 1
fi

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

DEST="$WORKDIR/$APP_ID"
mkdir -p "$DEST"
cp -r appinfo lib templates img js LICENSE README.md "$DEST/"

mkdir -p dist
TARBALL="dist/${APP_ID}-${VERSION}.tar.gz"
rm -f "$TARBALL"
tar -czf "$TARBALL" -C "$WORKDIR" "$APP_ID"

echo "Wrote $TARBALL"
