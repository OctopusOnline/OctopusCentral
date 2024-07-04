FROM node:18.7-slim

WORKDIR /home/node

COPY src/package*.json ./
RUN npm ci --no-update-notifier

COPY src/ ./

RUN echo "cd /home/node && node cli.js" >> /root/.bashrc

ENTRYPOINT ["node", "index.js"]