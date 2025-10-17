FROM node:20.19-slim

WORKDIR /home/node

ENV PATH="/home/node:${PATH}"

COPY src/package*.json ./
RUN npm i --no-update-notifier

COPY src/ ./

ENTRYPOINT exec node index.js