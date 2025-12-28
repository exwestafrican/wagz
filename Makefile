include .env

setup-db:
	./scripts/install_db.sh && ./scripts/setup_db.sh && ./scripts/setup_prisma.sh


setup: setup-db

setup-ssl:
	./scripts/setup_ssl.sh

setup-prisma:
	./scripts/setup_prisma.sh
