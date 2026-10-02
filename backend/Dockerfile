FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Migrate (and with SEED=1, fill an empty database with demo data),
# then serve the API with reload on file change.
CMD ["sh", "-c", "if [ \"$SEED\" = 1 ]; then npm run db:init; else npm run migrate; fi && npm run start:dev"]
