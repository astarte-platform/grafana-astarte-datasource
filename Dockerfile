FROM node:12-stretch as builder

WORKDIR /app
ADD . .
RUN apt-get -qq update
RUN apt-get -qq install netbase build-essential autoconf libffi-dev
RUN yarn install
RUN yarn build
ARG GRAFANA_API_KEY
RUN npx grafana-toolkit plugin:sign --signatureType private --rootUrls https://localhost:3000/

FROM grafana/grafana:7.3.10
COPY --from=builder /app/dist/ /var/lib/grafana/plugins/astarte-datasource/
