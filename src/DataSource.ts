import defaults from 'lodash/defaults';

import { getBackendSrv } from '@grafana/runtime';

import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';

import { AppEngineQuery, AppEngineDataSourceOptions, defaultQuery } from './types';

const REQUEST_SAMPLE_LIMIT = 5000;

interface AstarteDatastreamData {
  timestamps: number[];
  values: number[];
}

interface AstarteAppEngineData {
  data: AstarteDataPoint[];
}

interface AstarteDataPoint {
  timestamp: number;
  value: number;
}

interface AstarteDeviceStatus {
  connected: boolean;
  introspection: {
    [interfaceName: string]: {
      major: number;
      minor: number;
    };
  };
}

export class DataSource extends DataSourceApi<AppEngineQuery, AppEngineDataSourceOptions> {
  apiUrl: string;
  realm: string;
  token: string;

  constructor(instanceSettings: DataSourceInstanceSettings<AppEngineDataSourceOptions>) {
    super(instanceSettings);

    const { apiUrl, realm, token } = instanceSettings.jsonData;
    this.apiUrl = apiUrl || '';
    this.realm = realm || '';
    this.token = token || '';
  }

  async getDeviceList(): Promise<string[]> {
    const queryPath = new URL(`/appengine/v1/${this.realm}/devices`, this.apiUrl);
    const response = await getBackendSrv().datasourceRequest({
      method: 'GET',
      headers: { Authorization: `Bearer ${this.token}` },
      url: queryPath.toString(),
    });
    return response.data;
  }

  async getDeviceInfo(deviceID: string): Promise<AstarteDeviceStatus> {
    const queryPath = new URL(`/appengine/v1/${this.realm}/devices/${deviceID}`, this.apiUrl);
    const response = await getBackendSrv()
      .datasourceRequest({
        method: 'GET',
        headers: { Authorization: `Bearer ${this.token}` },
        url: queryPath.toString(),
      })
      .then((response) => response.data);
    return response.data;
  }

  async getDeviceInterfaceData(query: AppEngineQuery, from: number, to: number): Promise<AstarteDatastreamData> {
    const { device, interfaceName, path = '' } = query;
    const toISODate = new Date(to).toISOString();
    const queryPath = new URL(
      `/appengine/v1/${this.realm}/devices/${device}/interfaces/${interfaceName}/${path}`,
      this.apiUrl
    );

    const timestamps: number[] = [];
    const values: number[] = [];
    let hasMore = true;
    let startingTimestamp = from;

    while (hasMore) {
      const fromISODate = new Date(startingTimestamp).toISOString();
      const result = await getBackendSrv().datasourceRequest({
        method: 'GET',
        headers: { Authorization: `Bearer ${this.token}` },
        url: queryPath.toString(),
        params: {
          keep_milliseconds: true,
          since: fromISODate,
          to: toISODate,
          limit: REQUEST_SAMPLE_LIMIT,
        },
      });

      const responseBody: AstarteAppEngineData = result.data;
      const datapoints: AstarteDataPoint[] = responseBody.data;

      datapoints.forEach((datapoint: AstarteDataPoint) => {
        timestamps.push(datapoint.timestamp);
        values.push(datapoint.value);
      });

      if (datapoints.length < REQUEST_SAMPLE_LIMIT) {
        hasMore = false;
      } else {
        startingTimestamp = datapoints[datapoints.length - 1].timestamp;
      }
    }

    return {
      timestamps,
      values,
    };
  }

  async query(options: DataQueryRequest<AppEngineQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    const promises = options.targets
      .filter((target) => target.device !== '' && target.interfaceName !== '')
      .map((target) => {
        const query = defaults(target, defaultQuery);
        const promise = this.getDeviceInterfaceData(target, from, to).then(
          (data) =>
            new MutableDataFrame({
              refId: query.refId,
              fields: [
                { name: 'Time', values: data.timestamps, type: FieldType.time },
                { name: 'Value', values: data.values, type: FieldType.number },
              ],
            })
        );
        return promise;
      });

    return Promise.all(promises).then((data) => ({ data }));
  }

  async testDatasource() {
    const result = await this.getDeviceList()
      .then(() => ({
        status: 'success',
        message: 'Success',
      }))
      .catch(() => ({
        status: 'error',
        message: 'Could not connect to Astarte',
      }));

    return result;
  }
}
