# Install docker
sudo apt update

## check if docker is installed and uninstall with
sudo apt remove -y docker.io docker-compose-plugin
sudo apt autoremove -y

## installing docker
curl -fsSL https://get.docker.com | sudo sh
sudo apt install -y docker-compose-plugin
sudo usermod -aG docker ubuntu
logout


# Install certbot
sudo apt update
sudo apt install -y certbot

# Get  initial certificate (make sure port 80 is accessible)
sudo certbot certonly --standalone -d api.envoye.co
sudo certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d api.envoye.co
# using webroot method to avoid port 80 being blocked

# Create webroot directory for renewals
sudo mkdir -p /var/www/certbot

# Start containers
echo "🚀 Starting containers..."
docker compose up -d

# Test renewal
echo "🧪 Testing certificate renewal..."
sudo certbot renew --dry-run




# only run this is you want to save files locally
sudo mkdir -p /var/lib/uploads
sudo chown 1001:1001 /var/lib/uploads


