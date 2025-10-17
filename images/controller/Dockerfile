FROM node:20.19-slim

WORKDIR /home/node

ENV PATH="/home/node:${PATH}"

COPY bin/controller-cli /usr/local/bin/

COPY src/package*.json ./
RUN npm i --no-update-notifier

COPY src/ ./

RUN chmod +x /usr/local/bin/controller-cli \
 && echo "controller-cli && exit" >> /root/.bashrc

ENTRYPOINT exec node index.js