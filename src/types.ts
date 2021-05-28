import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface AppEngineQuery extends DataQuery {
  device: string;
  interfaceName: string;
  path: string;
}

export const defaultQuery: Partial<AppEngineQuery> = {
  device: '',
  interfaceName: '',
  path: '',
};

/**
 * These are options configured for each DataSource instance
 */
export interface AppEngineDataSourceOptions extends DataSourceJsonData {
  apiUrl: string;
  realm: string;
  token: string;
}
