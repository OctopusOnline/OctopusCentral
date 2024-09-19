#!/bin/bash

if [ "$DEBUG" == "true" ]; then
  node --inspect index.js
else
  node index.js
fi
