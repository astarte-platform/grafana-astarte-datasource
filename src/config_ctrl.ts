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
