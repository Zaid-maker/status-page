#!/bin/bash

commit=false
origin=$(git remote get-url origin)
if [[ $origin == *Zaid-maker/status-page* ]]; then
  commit=true
fi

KEYSARRAY=()
URLSARRAY=()

urlsConfig="./urls.cfg"
if [[ ! -f $urlsConfig ]]; then
  echo "Error: Configuration file '$urlsConfig' not found!"
  exit 1
fi

echo "Reading $urlsConfig"
while IFS='=' read -r key url; do
  if [[ -n $key && -n $url ]]; then
    KEYSARRAY+=("$key")
    URLSARRAY+=("$url")
    echo "  $key=$url"
  else
    echo "Warning: Skipping invalid line '$key=$url'"
  fi
done < "$urlsConfig"

if [[ ${#KEYSARRAY[@]} -eq 0 ]]; then
  echo "Error: No valid URLs found in configuration file."
  exit 1
fi

echo "***********************"
echo "Starting health checks with ${#KEYSARRAY[@]} configs:"

mkdir -p logs

for index in "${!KEYSARRAY[@]}"; do
  key="${KEYSARRAY[index]}"
  url="${URLSARRAY[index]}"
  echo "  Checking $key: $url"

  result="failed"
  for attempt in {1..4}; do
    response=$(curl --write-out '%{http_code}' --silent --output /dev/null "$url")
    if [[ "$response" =~ ^(200|202|301|307)$ ]]; then
      result="success"
      break
    fi
    sleep 5
  done

  dateTime=$(date +'%Y-%m-%d %H:%M')
  logEntry="$dateTime, $result (HTTP $response)"
  
  if [[ $commit == true ]]; then
    echo "$logEntry" >> "logs/${key}_report.log"
    echo "$(tail -6000 logs/${key}_report.log)" > "logs/${key}_report.log"
  else
    echo "    $logEntry"
  fi
done

if [[ $commit == true ]]; then
  git config --global user.name 'Zaid-maker'
  git config --global user.email 'pzhafeez@gmail.com'
  git add -A --force logs/
  git commit -am '[Automated] Update Health Check Logs'
  git push
fi
