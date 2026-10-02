# Shortcuts for the docker compose commands.

# Start the app. The database stays empty unless SEED=1 is given:
#   make SEED=1   on start, fill an empty database with 500 demo contacts
all:
	SEED=$(SEED) docker compose up --build

# Reset the database: drop everything, then create the 5 default columns
# and 500 contacts, or another number: make seed COUNT=10
# Works whether the app is running or not; reload the page after.
seed:
	docker compose run --rm -e SEED_COUNT=$(COUNT) backend npm run seed

# Stop and remove the containers. The database is kept.
clean:
	docker compose down

# Also delete the database and the images built for this project
# (docker compose labels them with the project name, set in docker-compose.yml).
fclean: clean
	docker compose down --volumes
	docker image prune --all --force --filter label=com.docker.compose.project=crm-rodium

re: fclean all

.PHONY: all seed clean fclean re
