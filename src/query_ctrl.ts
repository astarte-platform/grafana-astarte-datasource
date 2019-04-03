/*
   This file is part of Astarte.

   Copyright 2018 Ispirata Srl

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

///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import _ from 'lodash';
import {QueryCtrl} from 'grafana/app/plugins/sdk';
import './css/query_editor.css';

export class AstarteQueryCtrl extends QueryCtrl {
    static templateUrl = 'partials/query.editor.html';

    defaults = {
    };

    /** @ngInject **/
    constructor($scope, $injector, private templateSrv) {
        super($scope, $injector);

        _.defaultsDeep(this.target, this.defaults);

        this.queryDevice();
    }

    refreshMetricData() {
        this.panelCtrl.refresh();
    }

    queryDevice() {
        this.target.availableInterfaces = [];

        if (!this.target.deviceid) {
            return;
        }

        let deviceId: string = this.target.deviceid;
        let query: string = this.datasource.buildInterfacesQuery(deviceId);

        this.datasource
            .runAstarteQuery(query)
            .then(response => {
                if (response.status == 200) {
                    for (let value of response.data.data) {
                        this.target.availableInterfaces.push({ name: value });
                    }
                }
            });
    }
}
