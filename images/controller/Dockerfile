FROM node:20.19-slim

WORKDIR /home/node

ENV PATH="/home/node:${PATH}"
ENV DEBUG=false

COPY bin/controller-cli /usr/local/bin/

COPY src/package*.json ./
RUN npm i --no-update-notifier

COPY src/ ./

RUN echo "cd /home/node && controller-cli && exit" >> /root/.bashrc \
 && chmod +x ./entrypoint.sh \
 && chmod +x /usr/local/bin/controller-cli

ENTRYPOINT ["./entrypoint.sh"]