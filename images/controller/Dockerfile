FROM node:18.7-slim

WORKDIR /home/node

COPY src/package*.json ./
RUN npm ci --no-update-notifier

COPY src/ ./

ENTRYPOINT ["node", "index.js"]