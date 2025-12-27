# Install docker
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker ubuntu #add user to docker group
logout #logout to apply changes


# Install certbot
sudo apt update
sudo apt install -y certbot

# Get certificate (make sure port 80 is accessible)
sudo certbot certonly --standalone -d api.envoye.com

# Set up auto-renewal
sudo certbot renew --dry-run
