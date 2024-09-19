#!/bin/bash

if [ "$DEBUG" == "true" ]; then
  node --inspect=0.0.0.0:${DEBUG_PORT:-9229} index.js
else
  node index.js
fi
