#!/bin/bash

commit=true
origin=$(git remote get-url origin)
if [[ $origin == *Zaid-maker/status-page* ]]
then
  commit=true
fi

KEYSARRAY=()
URLSARRAY=()

urlsConfig="./urls.cfg"
echo "Reading $urlsConfig"
while read -r line
do
  echo "  $line"
  IFS='=' read -ra TOKENS <<< "$line"
  KEYSARRAY+=(${TOKENS[0]})
  URLSARRAY+=(${TOKENS[1]})
done < "$urlsConfig"

echo "********************"
echo "Starting health checks with ${#KEYSARRAY[@]} configs:"

mkdir -p logs

# Set max log entries for 30 days of retention
MAX_LOG_ENTRIES=8640

for (( index=0; index < ${#KEYSARRAY[@]}; index++))
do
  key="${KEYSARRAY[index]}"
  url="${URLSARRAY[index]}"
  echo "  $key=$url"

  for i in 1 2 3 4; 
  do
    # Customized curl with timeout, retry, and output on error
    response=$(curl --write-out '%{http_code}' --silent --output /dev/null \
                    --max-time 10 --retry 2 --retry-delay 5 "$url")
    
    if [[ "$response" -eq 200 ]] || [[ "$response" -eq 202 ]] || [[ "$response" -eq 301 ]] || [[ "$response" -eq 307 ]]; then
      result="success"
    else
      result="failed"
      # Log error details if failed
      echo "Error accessing $url, response code: $response" >> "logs/${key}_errors.log"
    fi
    
    if [[ "$result" = "success" ]]; then
      break
    fi
    sleep 5
  done
  dateTime=$(date +'%Y-%m-%d %H:%M')
  if [[ $commit == true ]]
  then
    echo "$dateTime, $result" >> "logs/${key}_report.log"
    # Limit the log entries to 8640 for 30-day retention
    tail -n "$MAX_LOG_ENTRIES" "logs/${key}_report.log" > "logs/${key}_report.tmp"
    mv "logs/${key}_report.tmp" "logs/${key}_report.log"
  else
    echo "    $dateTime, $result"
  fi
done

if [[ $commit == true ]]
then
  # Git configuration for automated commits
  git config --global user.name 'Zaid-maker'
  git config --global user.email 'pzhafeez@gmail.com'
  git add -A --force logs/
  git commit -am '[Automated] Update Health Check Logs'
  git push
fi
