FROM golang:1.18.8 as gobuilder
WORKDIR /app
RUN go install github.com/magefile/mage@v1.13.0
ADD go.mod .
ADD go.sum .
ADD Magefile.go .
RUN mkdir -p pkg
ADD pkg pkg
RUN mkdir -p src
ADD src/plugin.json src
RUN mage -v

FROM node:14-stretch as jsbuilder
WORKDIR /app
RUN apt-get -qq update
RUN apt-get -qq install netbase build-essential autoconf libffi-dev
COPY --from=gobuilder /app/ .
ADD package*.json ./
ADD yarn.lock .
RUN yarn install
RUN mkdir -p pkg
ADD src src
ADD LICENSE .
ADD README.md .
ADD CHANGELOG.md .
RUN yarn build
ARG GRAFANA_API_KEY
ENV GRAFANA_API_KEY=$GRAFANA_API_KEY
RUN npx grafana-toolkit plugin:sign --signatureType private --rootUrls http://localhost:3000/

FROM grafana/grafana:8.4.4
COPY --from=jsbuilder /app/dist/ /var/lib/grafana/plugins/astarte-datasource/
