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

export class AstarteConfigCtrl {
    static templateUrl = 'partials/config.html';
    current: any;

    server: string;
    realm: string;
    token: string;

    /** @ngInject **/
    constructor($scope) {
        this.server = $scope.ctrl.current.jsonData.server;
        this.realm = $scope.ctrl.current.jsonData.realm;
        this.token = $scope.ctrl.current.jsonData.token;
    }
}
