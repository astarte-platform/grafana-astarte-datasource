import React, { ChangeEvent, PureComponent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { AppEngineDataSourceOptions } from './types';

const { FormField } = LegacyForms;

interface Props extends DataSourcePluginOptionsEditorProps<AppEngineDataSourceOptions> {}

interface State {}

export class ConfigEditor extends PureComponent<Props, State> {
  onApiUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      apiUrl: event.target.value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  onRealmChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      realm: event.target.value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  onTokenChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      token: event.target.value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  render() {
    const { options } = this.props;
    const { jsonData } = options;

    return (
      <div className="gf-form-group">
        <div className="gf-form">
          <FormField
            label="Astarte API URL"
            labelWidth={10}
            inputWidth={20}
            onChange={this.onApiUrlChange}
            value={jsonData.apiUrl || ''}
            placeholder="https://api.my-astarte-cluster.com"
          />
        </div>
        <div className="gf-form">
          <FormField
            label="Realm"
            labelWidth={10}
            inputWidth={20}
            onChange={this.onRealmChange}
            value={jsonData.realm || ''}
            placeholder="realm"
          />
        </div>
        <div className="gf-form">
          <FormField
            label="Astarte API token"
            labelWidth={10}
            tooltip={
              <div>
                An Astarte token with read permissions for both AppEngine and Realm Management.
                <br />
                If you have access to the realm private key you can generate a token using&nbsp;
                <a href="https://github.com/astarte-platform/astartectl">astartectl</a>
              </div>
            }
            inputEl={
              <textarea
                className="gf-form-input width-20"
                onChange={this.onTokenChange}
                value={jsonData.token || ''}
                placeholder="your Astarte token"
              />
            }
          />
        </div>
      </div>
    );
  }
}
