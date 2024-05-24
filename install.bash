#!/bin/bash
echo "+======================================================+"
echo "|  ____                         _      _   _           |"
echo "| / ___|  _ __    __ _    ___  | | __ (_) | |_    ___  |"
echo "|| |     | '__|  / _\` |  / __| | |/ / | | | __|  / _ \ |"
echo "|| |___  | |    | (_| | | (__  |   <  | | | |_  | (_) ||"
echo "| \____| |_|     \__,_|  \___| |_|\_\ |_|  \__|  \___/ |"
echo "+======================================================+"

echo "Crackito installation script"

touch .env
touch .env.db
touch .env.gitea
touch .env.gitea-db
touch .env.woodpecker
touch .env.woodpecker-agent
#curl -o docker-compose.yml https://raw.githubusercontent.com/crackito-io/crackito/main/docker-compose.yml

#docker compose pull

get_size() {
    result_size=${#1}
}

get_container_ip() {
    container_ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $1)
}

generate_password() {
    password=$(tr -dc 'A-Za-z0-9!#$%&'\''()*+,-./:;<=>?@[\]^_`{|}~' </dev/urandom | head -c $1)
}

create_url() {
    lower_name=$(echo $1 | awk '{print tolower($0)}')
    read -p "Enter your $1 domain (e.g. $lower_name.example.com):" url_domain
    read -p "Are you using HTTPS for $lower_name? (Y/n):" url_https

    get_size $url_https

    if [ "$url_https" == "Y" ] || [ "$url_https" == "y" ] || [ "$result_size" == "0" ]; then
        protocol="https"
    else
        protocol="http"
    fi

    url="$protocol://$url_domain"
}

#: <<'END_COMMENT'
# Crackito configuration
create_url "Crackito"

crackito_url=$url

create_url "Woodpecker"
woodpecker_url=$url

# Gitea configuration

create_url "Gitea"
gitea_url=$url

echo "GITEA__server__ROOT_URL = \"$gitea_url\"" >>.env.gitea
gitea_database="crackito"
gitea_database_user="crackito"
generate_password 12
gitea_database_password=$password

gitea_user="crackito"
generate_password 12
gitea_password=$password

echo "GITEA__database__NAME = \"$gitea_database\"" >>.env.gitea
echo "GITEA__database__USER = \"$gitea_database_user\"" >>.env.gitea
echo "GITEA__database__PASSWD = \"$gitea_database_password\"" >>.env.gitea

echo "GITEA__security__INSTALL_LOCK = true" >>.env.gitea
echo "GITEA__server__APP_DATA_PATH = /data/gitea" >>.env.gitea
echo "GITEA__server__HTTP_PORT = 3000" >>.env.gitea
echo "GITEA__server__DISABLE_SSH = true" >>.env.gitea
echo "GITEA__server__SSH_PORT = 22" >>.env.gitea
echo "GITEA__server__SSH_LISTEN_PORT = 22" >>.env.gitea
echo "GITEA__service__DISABLE_REGISTRATION = true" >>.env.gitea
echo "GITEA__service__REQUIRE_SIGNIN_VIEW = false" >>.env.gitea
echo "GITEA__service__REGISTER_EMAIL_CONFIRM = false" >>.env.gitea
echo "GITEA__service__ENABLE_NOTIFY_MAIL = false" >>.env.gitea
echo "GITEA__service__ALLOW_ONLY_EXTERNAL_REGISTRATION = false" >>.env.gitea
echo "GITEA__service__ENABLE_CAPTCHA = false" >>.env.gitea
echo "GITEA__service__DEFAULT_KEEP_EMAIL_PRIVATE = false" >>.env.gitea
echo "GITEA__service__DEFAULT_ALLOW_CREATE_ORGANIZATION = true" >>.env.gitea
echo "GITEA__service__DEFAULT_ENABLE_TIMETRACKING = true" >>.env.gitea
echo "GITEA__openid__ENABLE_OPENID_SIGNIN = false" >>.env.gitea
echo "GITEA__openid__ENABLE_OPENID_SIGNUP = false" >>.env.gitea
echo "GITEA__database__DB_TYPE = postgres" >>.env.gitea
echo "GITEA__database__HOST = db-gitea:5432" >>.env.gitea

echo "POSTGRES_USER = \"$gitea_database_user\"" >>.env.gitea-db
echo "POSTGRES_PASSWORD =\"$gitea_database_password\"" >>.env.gitea-db
echo "POSTGRES_DB = \"$gitea_database\"" >>.env.gitea-db

read -p "Enter your Gitea admin email:" gitea_email

docker compose up gitea db-gitea -d

sleep 2

docker exec --user git gitea gitea admin user create --admin --username $gitea_user --password $gitea_password --email $gitea_email

get_container_ip gitea

sleep 2

token=$(echo -n "$gitea_user:$gitea_password" | base64)
access_token=$(curl --retry 5 --retry-delay 2 --connect-timeout 2 --location "http://$container_ip:3000/api/v1/users/$gitea_user/tokens" \
    --header 'Content-Type: application/json' \
    --header "Authorization: Basic $token" \
    --data '{
    "name": "feur",
    "scopes": [
        "write:user",
        "write:admin",
        "write:repository"
    ]
}' | sed -n 's|.*"sha1": *"\([^"]*\)".*|\1|p')

curl --retry 5 --retry-delay 2 --connect-timeout 2 --location "http://$container_ip:3000/api/v1/user/applications/oauth2" \
    --header 'Content-Type: application/json' \
    --header "Authorization: Bearer $access_token" \
    --data '{
    "confidential_client": true,
    "name": "Woodpecker",
    "redirect_uris": [
        "'$woodpecker_url'/authorize"
    ]
}' >gitea_oauth.json

echo "Gitea configuration done"

# Woodpecker configuration
echo "Woodpecker configuration"

gitea_client=$(cat gitea_oauth.json | sed -n 's|.*"client_id": *"\([^"]*\)".*|\1|p')
gitea_secret=$(cat gitea_oauth.json | sed -n 's|.*"client_secret": *"\([^"]*\)".*|\1|p')
rm gitea_oauth.json
generate_password 32
woodpecker_agent=$password

echo "WOODPECKER_GITEA=true" >>.env.woodpecker
echo "WOODPECKER_OPEN=false" >>.env.woodpecker
echo "WOODPECKER_ADMIN=\"$gitea_user\"" >>.env.woodpecker
echo "WOODPECKER_GITEA_URL=\"$gitea_url\"" >>.env.woodpecker
echo "WOODPECKER_GITEA_CLIENT=\"$gitea_client\"" >>.env.woodpecker
echo "WOODPECKER_GITEA_SECRET=\"$gitea_secret\"" >>.env.woodpecker
echo "WOODPECKER_HOST=\"$woodpecker_url\"" >>.env.woodpecker
echo "WOODPECKER_AGENT_SECRET=\"$woodpecker_agent\"" >>.env.woodpecker-agent

docker compose up woodpecker-server woodpecker-agent -d

echo "Gitea user: $gitea_user"
echo "Gitea password: $gitea_password"

read -p "Enter your Woodpecker admin token, available here $woodpecker_url/user#cli-and-api: " woodpecker_token

echo "Woodpecker configuration done"
#END_COMMENT

echo "Crackito configuration"

generate_password 100
app_key=$password
db_user="crackito"
generate_password 12
db_password=$password

db_host="db-crackito"
db_port="3306"
app_version="1.0.0"
db_name="crackito"

echo "PORT=\"8080\"" >>.env
echo "HOST=\"0.0.0.0\"" >>.env
echo "NODE_ENV=\"production\"" >>.env
echo "APP_NAME=\"Crackito\"" >>.env
echo "APP_KEY=\"$app_key\"" >>.env
echo "DRIVE_DISK=\"local\"" >>.env
echo "SESSION_DRIVER=\"cookie\"" >>.env
echo "CACHE_VIEWS=\"false\"" >>.env
echo "DATABASE_URL=\"mysql://$db_user:$db_password@$db_host:$db_port/$db_name?schema=public\"" >>.env
echo "VERSION=\"$app_version\"" >>.env
echo "WOODPECKER_URL=\"$woodpecker_url\"" >>.env
echo "WOODPECKER_TOKEN=\"$woodpecker_token\"" >>.env
echo "GITEA_URL=\"$gitea_url\"" >>.env
echo "GITEA_TOKEN=\"$access_token\"" >>.env

echo "MYSQL_USER=\"$db_user\"" >>.env.db
echo "MYSQL_PASSWORD=\"$db_password\"" >>.env.db
echo "MYSQL_DATABASE=\"$db_name\"" >>.env.db

docker compose up crackito -d

echo "Gitea user: $gitea_user"
echo "Gitea password: $gitea_password"
echo "Gitea url: $gitea_url"
echo "Woodpecker url: $woodpecker_url"
echo "Crackito url: $crackito_url"
