# Ibanking - Local development stack

COMPOSE := docker compose -f docker-compose.yaml
# Optional service selector for targets that can act on a single container,
# e.g. 
s ?=

.PHONY: help up down clean restart start stop build rebuild logs ps

up:
	$(COMPOSE) up
down: ## Stop and remove container
	$(COMPOSE) down

clean: ## Stop and remove container - volume
	$(COMPOSE) down -v

restart:
	

start:
	$(COMPOSE) start $(s)

stop:
	$(COMPOSE) stop $(s)


build:


rebuild:


ps: ## Show container status
	$(COMPOSE) ps

