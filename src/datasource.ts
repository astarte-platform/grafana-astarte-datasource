///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import _ from 'lodash';

class AstarteQuery {
    server: string;
    realm: string;
    deviceid: string;
    interface: string;
    path: string;

    since: Date;
    to: Date;
    downsample_to: number;

    constructor(_server, _realm, _deviceid, _interface, _path, _since, _to, _samples) {
        this.server = _server;
        this.realm = _realm;
        this.deviceid = _deviceid;
        this.interface = _interface;
        this.path = _path ? _path : "";
        this.since = _since ? _since : null;
        this.to = _to ? _to : null;
        this.downsample_to = _samples > 0 ? _samples : 0;
    }

    toString() {
        let query: string = `${this.server}/${this.realm}/devices/${this.deviceid}/interfaces/${this.interface}`
        if (this.path) {
            query += `/${this.path}`;
        }
        query += `?format=disjoint_tables&keep_milliseconds=true`;
        if (this.since) {
            query += `&since=${this.since.toISOString()}`;
        }
        if (this.to) {
            query += `&to=${this.to.toISOString()}`;
        }
        if (this.downsample_to) {
            query += `&downsample_to=${Math.floor(this.downsample_to)}`;
        }

        return encodeURI(query);
    }
}

export default class AstarteDatasource {
    id: number;
    name: string;
    server: string;
    realm: string;
    token: string;

    /** @ngInject */
    constructor(instanceSettings, private backendSrv, private templateSrv, private $q) {
        this.name = instanceSettings.name;
        this.id = instanceSettings.id;
        this.server = instanceSettings.jsonData.server;
        this.realm = instanceSettings.jsonData.realm;
        this.token = instanceSettings.jsonData.token;
    }

    query(options) {
        let from: Date = options.range.from._d;
        let to: Date = options.range.to._d;
        let fromTime: number = from.getTime();
        let toTime: number = to.getTime();

        let interval: number = options.intervalMs;

        //Build the query
        let queries: AstarteQuery[] = [];

        for (let entry of options.targets) {
            let query: AstarteQuery;

            if (entry.hide) {
                continue;
            }

            if (entry.deviceid && entry.interface) {
                query = new AstarteQuery
                        ( this.server
                        , this.realm
                        , entry.deviceid
                        , entry.interface
                        , entry.path
                        , from
                        , to
                        , (toTime - fromTime) / interval
                        );

                queries.push(query);
            }
        }

        if (queries.length <= 0) {
            return this.$q.when({ data: [] });
        }

        //launch the query
        let promises: any[] = [];
        for (let entry of queries) {
            let promise: any;
            if (this.token) {
                promise = this.backendSrv.datasourceRequest({
                    url: entry.toString(),
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
            } else {
                promise = this.backendSrv.datasourceRequest({
                    url: entry.toString(),
                    method: 'GET'
                });
            }
            promises.push(promise.then(response => {
                if (response.status == 200) {
                    let result: any = { data : [] };
                    let series: any = response.data.data;
                    //use for - in (instead of for - on) loop
                    //because data arrives in an associative array
                    for (let key in series) {
                        let timeSeries = series[key];

                        if (timeSeries.length && typeof timeSeries[0][0] === "number") {
                            //TODO: implement data column selection/filter
                            result.data.push({ "target": key, "datapoints": timeSeries });
                        }
                    }

                    return result;
                } else {
                    console.log(response);
                    return { data: [] };
                }
            }));
        }

        //TODO: implement multiple GET requests
        return promises[0];
    }

  annotationQuery(options) {
    throw new Error("Annotation Support not implemented yet.");
  }

  metricFindQuery(query: string) {
    throw new Error("Template Variable Support not implemented yet.");
  }

  testDatasource() {
    return { status: "success", message: "Data source is working", title: "Success" };
  }
}
