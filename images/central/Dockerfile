FROM node:20.19-slim

WORKDIR /home/node

ENV PATH="/home/node:${PATH}"
ENV DEBUG=false

COPY src/package*.json ./
RUN npm i --no-update-notifier

COPY src/ ./

RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]