import AstarteDatasource from './datasource';
import {AstarteQueryCtrl} from './query_ctrl';
import {AstarteConfigCtrl} from './config_ctrl';

class AstarteAnnotationsQueryCtrl {
  static templateUrl = 'partials/annotations.editor.html';
}

export {
  AstarteDatasource as Datasource,
  AstarteQueryCtrl as QueryCtrl,
  AstarteConfigCtrl as ConfigCtrl,
  AstarteAnnotationsQueryCtrl as AnnotationsQueryCtrl,
};
