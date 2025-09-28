#!/bin/bash

if [ "$DEBUG" == "true" ]; then
  exec node --inspect=0.0.0.0:"${DEBUG_PORT:-9229}" index.js
else
  exec node index.js
fi
