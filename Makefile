include .env
# Ibanking - Local development stack

COMPOSE := docker compose -f docker-compose.yaml
# Optional service selector for targets that can act on a single container,
# e.g. 
s ?=

.PHONY: help up down clean restart start stop build rebuild logs ps psql test

up:
	$(COMPOSE) up -d
down: ## Stop and remove container
	$(COMPOSE) down

clean: ## Stop and remove container - volume
	$(COMPOSE) down -v

restart:
	$(COMPOSE) restart $(s)

start:
	$(COMPOSE) start $(s)

stop:
	$(COMPOSE) stop $(s)


build:
	$(COMPOSE) up -d --build

rebuild:
	$(COMPOSE) down -v
	$(COMPOSE) up -d --build

ps: ## Show container status
	$(COMPOSE) ps

psql: ## make psql s=db_name
	docker exec -it postgres_db psql -U ${DB_USER} -d $(s)

test:
	docker exec -it auth_service pytest test.py
	docker exec -it customer_service pytest test.py
	docker exec -it payment_service pytest test.py
	docker exec -it tuition_service pytest test.py

logs:
	docker logs auth_service
	docker logs customer_service
	docker logs payment_service
	docker logs tuition_service
