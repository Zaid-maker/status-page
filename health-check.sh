commit=true
origin=$(git remote get-url origin)

# Check if the script is running on the "Zaid-maker/status-page" repository
if [[ $origin == *Zaid-maker/status-page* ]]; then
  commit=true
fi

KEYSARRAY=()
URLSARRAY=()

# Read URLs and keys from the configuration file
urlsConfig="./urls.cfg"
echo "Reading $urlsConfig"
while IFS='=' read -r key url; do
  KEYSARRAY+=("$key")
  URLSARRAY+=("$url")
done < "$urlsConfig"

echo "***********************"
echo "Starting health checks with ${#KEYSARRAY[@]} configs:"

mkdir -p logs

for ((index=0; index < ${#KEYSARRAY[@]}; index++)); do
  key="${KEYSARRAY[index]}"
  url="${URLSARRAY[index]}"
  echo "  $key=$url"

  # Retry up to 4 times with 5 seconds delay between attempts
  for i in {1..4}; do
    response=$(curl --write-out '%{http_code}' --silent --output /dev/null "$url")
    if [[ "$response" -eq 200 || "$response" -eq 202 || "$response" -eq 301 || "$response" -eq 307 ]]; then
      result="success"
      break
    else
      result="failed"
    fi
    sleep 5
  done

  dateTime=$(date +'%Y-%m-%d %H:%M')
  if [[ $commit == true ]]; then
    echo "$dateTime, $result" >> "logs/${key}_report.log"
  else
    echo "  $dateTime, $result"
  fi
done

if [[ $commit == true ]]; then
  # Set Git user information (modify if needed)
  git config --global user.name "Zaid-maker"
  git config --global user.email "pzhafeez@gmail.com"

  # Add and commit changes to the logs directory
  git add -A --force logs/
  git commit -am "[Automated] Update Health Check Logs"
  git push
fi
