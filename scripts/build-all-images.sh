#!/bin/sh

if [ -d "$(pwd)/images" ]; then
  images_path="$(pwd)/images"
elif [ -d "../images" ]; then
  images_path="../images"
else
  echo "Error: 'images' directory not found"
  exit 1
fi

for dir in "$images_path"/*/ ; do
  if [ -d "$dir" ] && [ -f "$dir/build.sh" ]; then
    (cd "$dir" && ./build.sh)
  fi
done