# The upstream build environment is pinned by content digest.
FROM --platform=linux/amd64 glondu/beleniosbase:20260425-1@sha256:3d57d508592aa94124473052e0beefcb6c06408fcbb1ded99febd6e70c4e7b62 AS build
COPY --chown=belenios vendor/belenios /home/belenios/source
WORKDIR /home/belenios/source
ENV BELENIOS_BUILD=3.3.0
RUN . /home/belenios/.belenios/env.sh && dune build --release src/tool/main.exe src/web/static/belenios_jslib.js
RUN mkdir -p /home/belenios/output && cp _build/default/src/tool/main.exe /home/belenios/output/belenios-tool && cp _build/default/src/web/static/belenios_jslib.js /home/belenios/output/belenios.js && cp vendor/libsodium/libsodium.wasm /home/belenios/output/ && cp vendor/libsodium/LICENSE /home/belenios/output/LICENSE.libsodium && cp COPYING /home/belenios/output/COPYING.belenios
COPY --chown=belenios tools/native /home/belenios/source/src/openvote_share
RUN . /home/belenios/.belenios/env.sh && dune build --release src/openvote_share/share_verify.exe && cp _build/default/src/openvote_share/share_verify.exe /home/belenios/output/openvote-share-verify

FROM --platform=linux/amd64 debian:13-slim@sha256:d7e12182ce18b85b93007c1dedf31f2d29e01ccf3182cc4017c709b6259bc132 AS crypto-runtime
RUN apt-get update -qq && apt-get install -y --no-install-recommends ca-certificates libev4t64 libgmp10 libsodium23 libssl3t64 zlib1g bash jq python3 && rm -rf /var/lib/apt/lists/*
COPY --from=build /home/belenios/output /opt/belenios
COPY LICENSE /opt/belenios/LICENSE.openvote
ENV PATH=/opt/belenios:$PATH
WORKDIR /work
ENTRYPOINT ["belenios-tool"]

FROM --platform=linux/amd64 node:24.20.0-trixie-slim@sha256:a747ad80c8a161b650d79a6da9c422005b91148b18b8d2c669eb5a0b7c07e600 AS node-build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN pnpm install --frozen-lockfile
COPY apps/web apps/web
COPY packages/domain packages/domain
COPY --from=build /home/belenios/output/belenios.js /home/belenios/output/libsodium.wasm /home/belenios/output/COPYING.belenios /home/belenios/output/LICENSE.libsodium apps/web/public/crypto/
RUN pnpm --filter @openvote/web build

FROM --platform=linux/amd64 node:24.20.0-trixie-slim@sha256:a747ad80c8a161b650d79a6da9c422005b91148b18b8d2c669eb5a0b7c07e600 AS render-runtime
RUN apt-get update -qq && apt-get install -y --no-install-recommends ca-certificates libev4t64 libgmp10 libsodium23 libssl3t64 zlib1g nginx python3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /home/belenios/output /opt/belenios
COPY --from=node-build /app/node_modules node_modules
COPY --from=node-build /app/apps/web/dist apps/web/dist
COPY apps/api apps/api
COPY packages packages
COPY scripts scripts
COPY tools tools
COPY migrations migrations
COPY infra/nginx.conf.template infra/nginx.conf.template
COPY package.json LICENSE ./
RUN mkdir -p /app/.runtime-disk /tmp/openvote-client-body /tmp/openvote-proxy /tmp/openvote-fastcgi /tmp/openvote-uwsgi /tmp/openvote-scgi && ln -s /app/.runtime-disk/state /app/.runtime && chown -R node:node /app /tmp/openvote-client-body /tmp/openvote-proxy /tmp/openvote-fastcgi /tmp/openvote-uwsgi /tmp/openvote-scgi
ENV PATH=/opt/belenios:$PATH
ENV NODE_ENV=production
USER node
EXPOSE 10000
CMD ["node", "scripts/render-start.ts"]
