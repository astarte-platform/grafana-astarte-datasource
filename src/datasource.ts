///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import _ from 'lodash';

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

    baseQueryPath() {
        return `${this.server}/${this.realm}`;
    }

    isBase64Id(deviceId) {
        return /^[A-Za-z0-9_\-]{22}$/g.test(deviceId);
    }

    buildInterfacesQuery(deviceId) {
        let query: string = this.baseQueryPath();

        if (this.isBase64Id(deviceId)) {
            query += `/devices/${deviceId}/interfaces`;
        } else {
            query += `/devices-by-alias/${deviceId}/interfaces`;
        }

        return encodeURI(query);
    }

    buildEndpointQuery(deviceId, interfaceName, path, since, to, downsampleTo) {
        let query: string = this.baseQueryPath();

        if (this.isBase64Id(deviceId)) {
            query += `/devices/${deviceId}`;
        } else {
            query += `/devices-by-alias/${deviceId}`;
        }

        query += `/interfaces/${interfaceName}`;

        if (path) {
            query += `/${path}`;
        }
        query += `?format=disjoint_tables&keep_milliseconds=true`;
        if (since) {
            query += `&since=${since.toISOString()}`;
        }
        if (to) {
            query += `&to=${to.toISOString()}`;
        }
        if (downsampleTo > 0) {
            query += `&downsample_to=${Math.floor(downsampleTo)}`;
        }

        return encodeURI(query);
    }

    runAstarteQuery(query) {
        return this.backendSrv.datasourceRequest({
            url: query,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
    }

    query(options) {
        let from: Date = options.range.from._d;
        let to: Date = options.range.to._d;
        let fromTime: number = from.getTime();
        let toTime: number = to.getTime();

        let interval: number = options.intervalMs;
        let promises: any[] = [];
        let query: string;
        let promise: any;

        for (let entry of options.targets) {

            if (entry.hide) {
                continue;
            }

            if (entry.deviceid && entry.interface) {
                query = this.buildEndpointQuery
                        ( entry.deviceid
                        , entry.interface
                        , entry.path
                        , from
                        , to
                        , (toTime - fromTime) / interval
                        );

                promise = this.runAstarteQuery(query);

                promises.push(promise.then(response => {

                    if (this.isBase64Id(entry.deviceid)) {
                        response.deviceLabel = entry.deviceid.substring(0, 5);
                    } else {
                        response.deviceLabel = entry.deviceid;
                    }

                    return response;
                }));
            }
        }

        if (promises.length <= 0) {
            return this.$q.when({ data: [] });
        }

        let allPromises: any;
        allPromises = this.$q.all(promises).then(results => {

            let result: any = { data : [] };

            _.forEach(results, function(response) {

                if (response.status == 200) {
                    let series: any = response.data.data;
                    let targetName: string;

                    //use for - in (instead of for - on) loop
                    //because data arrives in an associative array
                    for (let key in series) {
                        let timeSeries = series[key];

                        targetName = `${key}[${response.deviceLabel}]`;

                        if (timeSeries.length && typeof timeSeries[0][0] === "number") {
                            //TODO: implement data column selection/filter
                            result.data.push({ "target": targetName, "datapoints": timeSeries });
                        }
                    }
                }

            });

            return result;
        });

        return allPromises;
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
