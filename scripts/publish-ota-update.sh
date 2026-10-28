#!/bin/sh
set -eu
if [ "$#" -ne 2 ]; then
  printf '%s\n' 'Usage: npm run ota:publish -- UPDATE_VERSION NATIVE_VERSION' >&2
  exit 2
fi
npm run ota:prepare -- "$1" "$2"
npm run build:hosted
firebase deploy --only hosting --project khora-lulu-2026 --non-interactive
