image_sha="$1"

sed -i '/^IMAGE_TAG=/d' .env
echo "IMAGE_TAG=sha-${image_sha}" >> .env
docker compose pull
docker compose up -d --remove-orphans