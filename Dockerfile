FROM node:lts-slim

ARG perms=g-w

WORKDIR /app
ADD . /app
RUN echo 'Running chmod with perms' $perms
RUN chmod -R ${perms} /app
ENV NODE_ENV=production
RUN apt-get update \
    && npm install pm2 && mkdir .pm2 && chmod 777 .pm2 \
    && npm install \
    && apt-get clean
ENV PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:node_modules/.bin
ENV HOME=/app
VOLUME /Pictures

CMD pm2-docker -n app ./index.js -- /Pictures
EXPOSE 3001/tcp
