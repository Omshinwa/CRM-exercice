FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# --host: listen on all interfaces so the port is reachable from outside the container
CMD ["npm", "run", "dev", "--", "--host"]
