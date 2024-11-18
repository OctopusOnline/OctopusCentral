FROM node:18.7-slim

LABEL octopus.instance.volumes=""
LABEL octopus.instance.ports=""

WORKDIR /home/node

ENV DEBUG=false

COPY src/package*.json ./
RUN npm ci --no-update-notifier

COPY src/ ./

RUN echo "cd /home/node && node cli.js && exit" >> /root/.bashrc \
    chmod +x ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]