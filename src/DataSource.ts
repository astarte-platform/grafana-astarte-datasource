/*
   This file is part of Astarte.

   Copyright 2021 Ispirata Srl
   Copyright 2022-2023 SECO Mind Srl

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

import type { DataSourceInstanceSettings, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';

import { AppEngineQuery, AppEngineDataSourceOptions } from './types';

export class DataSource extends DataSourceWithBackend<AppEngineQuery, AppEngineDataSourceOptions> {
  jsonData: AppEngineDataSourceOptions;

  constructor(instanceSettings: DataSourceInstanceSettings<AppEngineDataSourceOptions>) {
    super(instanceSettings);

    this.jsonData = instanceSettings.jsonData;
  }

  applyTemplateVariables(query: AppEngineQuery, scopedVars: ScopedVars): AppEngineQuery {
    const apply = (text: string) => getTemplateSrv().replace(text, scopedVars);

    return {
      ...query,
      device: apply(query.device),
      interfaceName: apply(query.interfaceName),
      path: apply(query.path),
    };
  }
}
