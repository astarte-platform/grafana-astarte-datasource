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

import React, { ChangeEvent, useState, useEffect } from 'react';
import { LegacyForms } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './DataSource';
import { AppEngineDataSourceOptions, AppEngineQuery } from './types';

const { FormField } = LegacyForms;

type Props = QueryEditorProps<DataSource, AppEngineQuery, AppEngineDataSourceOptions>;

function isValidQuery(query: AppEngineQuery) {
  return query.interfaceName !== '' && query.device !== '' && query.path !== '';
}

type InterfaceID = {
  name: string;
  major: number;
  minor: number;
};

type AstarteMapping = {
  endpoint: string;
};

type AstarteInterface = {
  mappings: AstarteMapping[];
};

export const QueryEditor = ({ datasource, query, onChange, onRunQuery }: Props) => {
  const [introspection, setIntrospection] = useState<InterfaceID[]>([]);
  const [interfaceDefinition, setInterfaceDefinition] = useState<AstarteInterface | null>(null);
  const { device, interfaceName, path } = query;

  useEffect(() => {
    datasource
      .getResource('introspection', { device_id: query.device })
      .then(setIntrospection)
      .catch((error) => {
        console.error(error);
        setIntrospection([]);
      });
  }, [datasource, query.device]);

  useEffect(() => {
    if (introspection) {
      const interfaceID = introspection.find((id) => id.name === interfaceName);
      if (interfaceName && interfaceID) {
        datasource
          .getResource('interface', { name: interfaceName, major: interfaceID.major })
          .then(setInterfaceDefinition)
          .catch((error) => {
            console.error(error);
            setInterfaceDefinition(null);
          });
      } else {
        setInterfaceDefinition(null);
      }
    }
  }, [datasource, interfaceName, introspection]);

  const onDeviceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const deviceId = event.target.value;
    const updatedQuery = { ...query, device: deviceId };
    onChange(updatedQuery);
    if (isValidQuery(updatedQuery)) {
      onRunQuery();
    }
  };

  const onInterfaceNameChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const updatedQuery = { ...query, interfaceName: event.target.value };
    onChange(updatedQuery);
    if (isValidQuery(updatedQuery)) {
      onRunQuery();
    }
  };

  const onPathChange = (event: ChangeEvent<HTMLInputElement>) => {
    const updatedQuery = { ...query, path: event.target.value };
    onChange(updatedQuery);
    if (isValidQuery(updatedQuery)) {
      onRunQuery();
    }
  };

  const interfaces = introspection.map((iid) => iid.name);
  const endpoints = interfaceDefinition?.mappings.map((m) => m.endpoint);

  return (
    <div className="gf-form">
      <FormField width={4} value={device} onChange={onDeviceChange} label="Device ID" tooltip="The device ID" />
      <FormField
        width={4}
        value={interfaceName}
        onChange={onInterfaceNameChange}
        label="Interface"
        tooltip="The interface to query"
        list={interfaces.length > 0 ? 'interfaceSuggestions' : undefined}
      />
      {interfaces.length > 0 && (
        <datalist id="interfaceSuggestions">
          {interfaces.map((iface) => (
            <option key={iface} value={iface}>
              {iface}
            </option>
          ))}
        </datalist>
      )}
      <FormField
        width={4}
        value={path}
        onChange={onPathChange}
        label="Path"
        tooltip="The interface path to query"
        list={endpoints && endpoints.length > 0 ? 'endpointSuggestions' : undefined}
      />
      {endpoints && (
        <datalist id="endpointSuggestions">
          {endpoints.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </datalist>
      )}
    </div>
  );
};
