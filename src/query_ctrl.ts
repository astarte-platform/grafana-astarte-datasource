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
