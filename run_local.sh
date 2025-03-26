#!/usr/bin/env bash

npx ncc build index.js -o dist

act -j "annotate-pr-local" --container-architecture linux/amd64 --secret-file .secrets --eventpath event.json --verbose --bind