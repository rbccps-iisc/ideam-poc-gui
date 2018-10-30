#!/bin/bash
schemas_dir="schemas"
if [ ! -d "$schemas_dir" ]; then
  mkdir "$schemas_dir"
fi

while IFS='' read -r line || [[ -n "$line" ]]; do

    versionfile="$line.zip"
    #echo "$versionfile"
    if [ -e ./$schemas_dir/"$versionfile" ]; then
        echo "Schema Version Exists"
    else
      cd ./$schemas_dir
      tmpdir="$(echo $line | sed 's/^v\(.*\)/\1/')"
      if [ ! -d "$tmpdir" ]; then
        echo "Fetching release: $line"
        wget https://github.com/rbccps-iisc/smart_cities_schemas/archive/$line.zip
        unzip $line.zip
        mv smart_cities_schemas-$tmpdir $tmpdir
      else
        echo "Schema Version $line Exists"
      fi
      cd ../
    fi

done < "schemas_versions_list.txt"

