#!/bin/bash
sudo mkdir -p /etc/letsencrypt/live/api.envoye.co

# Setup SSL certificate for api.envoye.co
sudo openssl req -x509 -nodes -days 9999 -newkey rsa:2048 \
  -keyout /etc/letsencrypt/live/api.envoye.co/privkey.pem \
  -out /etc/letsencrypt/live/api.envoye.co/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=api.envoye.co" \
  -addext "subjectAltName=DNS:api.envoye.co,DNS:localhost,IP:127.0.0.1"

# Set permissions for the certificate files
sudo chmod 755 /etc/letsencrypt/live/api.envoye.co
sudo chmod 644 /etc/letsencrypt/live/api.envoye.co/fullchain.pem
sudo chmod 644 /etc/letsencrypt/live/api.envoye.co/privkey.pem
