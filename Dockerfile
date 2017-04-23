FROM node:4-onbuild

# Add Tini
ENV TINI_VERSION v0.14.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]

EXPOSE 80
EXPOSE 1900/udp
EXPOSE 5353/udp
ENV NODE_ENV production

RUN mkdir -p /usr/src/webtorrent-cast && chown node:node /usr/src/webtorrent-cast
WORKDIR /usr/src/webtorrent-cast

USER node
ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN cp -a /tmp/node_modules /usr/src/webtorrent-cast/

ADD . /usr/src/webtorrent-cast

CMD [ "node", "index.js" ]



