#!/bin/bash

#
# Takes a csv from digfemig
# - Extracts the post urls from the csv
# - Generates a collage using the images with links back to the posts
#
# The format of the instagram.csv is: file_name,username,post_url,caption
#
# Requirements:
# - digfemig (pip install digfemig)
# - csvcut (pip install csvkit)
#
###############################################################################
# CONFIG
###############################################################################

pushd ${BASH_SOURCE%/*} > /dev/null
: ${IMAGE_BUCKET_SIZE:=20000}
: ${MAX_IMAGES:=99999999999}
: ${THREADS:=3}
: ${TIMEOUT:=60}
: ${TEMPLATE:="$(pwd)/demo_instagram.template.html"}
: ${DOWNLOAD_CACHE:=""} # Will default to collagename_downloads

: ${BACKGROUND:="000000"}
: ${RAW_W:=2}
: ${RAW_H:=2}
: ${ALLOW_UPSCALE:=true}

: ${JUXTA_HOME:="$(pwd)"}
popd > /dev/null

export JUXTA_HOME

################################################################################
# FUNCTIONS
################################################################################

usage() {
    echo "./demo_instagram.sh instagram.csv path-to-images [collage_name]"
    exit "$1"
}

parse_arguments() {
    INSTAGRAM_CSV="$1"
    IMAGES_PATH="$2"
    COLLAGE_NAME="$3"

    if [[ -z "$INSTAGRAM_CSV" || ! -f "$INSTAGRAM_CSV" || ! -r "$INSTAGRAM_CSV" ]]; then
        >&2 echo "Error: No valid CSV file found at '$INSTAGRAM_CSV'"
        usage 1
    fi

    if [[ ! -d "$IMAGES_PATH" ]]; then
        >&2 echo "Error: '$IMAGES_PATH' is not a valid directory"
        usage 1
    fi

    if [[ "." == ".$COLLAGE_NAME" ]]; then
        COLLAGE_NAME=$(basename "$INSTAGRAM_CSV")
        COLLAGE_NAME="${COLLAGE_NAME%.*}"
        COLLAGE_NAME="instagram_${COLLAGE_NAME}"
        echo "No collage name specified, using $COLLAGE_NAME"
    fi

    if [[ "." == .$(which csvcut) ]]; then
        >&2 echo "Error: csvcut not available. Install with 'pip install csvkit'"
        exit 9
    fi
    : ${DOWNLOAD:="${COLLAGE_NAME}_downloads"}
}

prepare_juxta_input() {

    if [[ -z "$INSTAGRAM_CSV" || ! -f "$INSTAGRAM_CSV" || ! -r "$INSTAGRAM_CSV" ]]; then
        >&2 echo "Error: No valid CSV file found at '$INSTAGRAM_CSV'"
        return 1
    fi

    if [[ ! -d "$IMAGES_PATH" ]]; then
        >&2 echo "Error: Image path '$IMAGES_PATH' does not exist or is not a directory"
        return 1
    fi

    OUTPUT_FILE="$COLLAGE_NAME/juxta_instagram_images.dat"
    > "$OUTPUT_FILE"

    csvcut -c 1,3 "$INSTAGRAM_CSV" | tail -n +2 | while IFS=, read -r file_name post_url; do
        if [[ "$file_name" =~ \.jpg$ ]]; then
            if [[ "$file_name" =~ -([0-9]{14})- ]]; then
                raw_timestamp="${BASH_REMATCH[1]}"
                formatted_timestamp=$(date -d "${raw_timestamp:0:8} ${raw_timestamp:8:2}:${raw_timestamp:10:2}:${raw_timestamp:12:2}" "+%Y-%m-%d %H:%M:%S")

                echo "$IMAGES_PATH/$file_name|$post_url $formatted_timestamp" >> "$OUTPUT_FILE"
            else
                >&2 echo "Warning: Could not extract timestamp from filename '$file_name'"
            fi
        else
            >&2 echo "Skipping non-JPG file: $file_name"
        fi
    done
}

###############################################################################
# CODE
###############################################################################

parse_arguments "$@"
mkdir $COLLAGE_NAME
prepare_juxta_input

export TEMPLATE
export RAW_W
export RAW_H
export THREADS
INCLUDE_ORIGIN=false . ${JUXTA_HOME}/juxta.sh "$COLLAGE_NAME/juxta_instagram_images.dat" "$COLLAGE_NAME"
