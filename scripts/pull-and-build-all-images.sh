#!/bin/sh

# ------ goto-project-root helper ------

if [ -d "$(pwd)/images" ]; then
  cd $(pwd)
elif [ -d "../images" ]; then
  cd ..
else
  echo "Error: Project-Root not found"
  exit 1
fi

#---------------------------------------

git pull
./scripts/build-all-images.sh