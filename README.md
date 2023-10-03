# Grafana Astarte Datasource

This plugin allows you to retieve and plot numeric [Astarte](https://astarte.cloud/) data.
In the Astarte lingo, you can fetch individual datstream data of these types: integers, longintegers and floats.

![Example data visualization using Grafana Astarte Datatsource](https://github.com/astarte-platform/grafana-astarte-datasource/blob/master/src/img/board.png?raw=true)

## Installation
Install the plugin using grafana console tool: `grafana-cli plugins install grafana-astarte-datasource`.
The plugin will be installed into your grafana plugins directory; the default is `/var/lib/grafana/plugins`.

Alternatively, download the plugin using [latest release](https://github.com/astarte-platform/grafana-astarte-datasource/releases/latest), please download `grafana-astarte-datasource-VERSION.zip` and uncompress a file into the Grafana plugins directory (`grafana/plugins`). 

## Plugin Configuration
![Configuration dashboard](https://github.com/astarte-platform/grafana-astarte-datasource/blob/master/src/img/config.png?raw=true)
The following values are required:
- Astarte base URL: the base URL of your Astarte instance, e.g.`https://api.my.astarte.instance`
- Realm name: the name of the Astarte Realm you want to retrieve data from, e.g. `test`
- Astarte API token: a valid JWT to access realm data. It must contain claim for at least AppEngine and RealmManagement services.
You can generate one using [astartectl](https://github.com/astarte-platform/astartectl): `astartectl utils gen-jwt appengine realm-management`.

## Features
The Astarte Grafana Datasource supports:
- Querying data from Astarte using Device ID, interface name and path
- Autocomplete interface and path
- Alerting using Grafana Alerting
