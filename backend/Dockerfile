FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Migrate and seed (if empty), then serve the API with reload on file change.
CMD ["sh", "-c", "npm run db:init && npm run start:dev"]
