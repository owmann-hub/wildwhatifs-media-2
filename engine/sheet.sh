#!/bin/bash
# sheet.sh scene "t1,t2,..." cols
rm -rf stills/$1; W=540 H=960 node render.mjs $1 stills stills/$1 $2 2>&1 | grep -E "error|done" 
ffmpeg -loglevel error -y -pattern_type glob -i "stills/$1/$1_*.jpg" -vf "scale=360:640,tile=${3:-5}x3" -frames:v 1 stills/${1}_sheet.jpg
