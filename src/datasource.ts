import _ from 'lodash';

import {BackendSrv} from 'grafana/app/core/services/backend_srv';
import {TemplateSrv} from 'grafana/app/features/templating/template_srv';

import {TSDBQuery, TSDBRequest, TSDBRequestOptions} from './types';

import {
  DataSourceApi,
  DataSourceInstanceSettings,
  DataQueryRequest,
  DataQueryResponse,
} from '@grafana/ui';

export class GenericDatasource implements DataSourceApi<TSDBQuery> {
  name: string;
  id: number;
  url?: string;
  withCredentials?: boolean;
  instanceSettings: any;
  headers: any;

  /** @ngInject */
  constructor(
    instanceSettings: DataSourceInstanceSettings,
    private backendSrv: BackendSrv,
    private templateSrv: TemplateSrv
  ) {
    this.name = instanceSettings.name;
    this.id = instanceSettings.id;

    this.url = instanceSettings.url;
    this.withCredentials = instanceSettings.withCredentials;

    this.headers = {'Content-Type': 'application/json'};
    if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
      this.headers['Authorization'] = instanceSettings.basicAuth;
    }
  }

  query(options: DataQueryRequest<TSDBQuery>): Promise<DataQueryResponse> {
    const query = this.buildQueryParameters(options);

    if (query.targets.length <= 0) {
      return Promise.resolve({data: []});
    }

    return this.doTsdbRequest(query).then(handleTsdbResponse);
  }

  testDatasource() {
    return this.doRequest({
      url: this.url + '/',
      method: 'GET',
    })
      .then((response: any) => {
        if (response.status === 200) {
          return {status: 'success', message: 'Data source is working', title: 'Success'};
        } else {
          return {status: 'failed', message: 'Data source is not working', title: 'Error'};
        }
      })
      .catch(error => {
        return {status: 'failed', message: 'Data source is not working', title: 'Error'};
      });
  }

  annotationQuery(options: any) {
    const query = this.templateSrv.replace(options.annotation.query, {}, 'glob');
    const annotationQuery = {
      range: options.range,
      annotation: {
        name: options.annotation.name,
        datasource: options.annotation.datasource,
        enable: options.annotation.enable,
        iconColor: options.annotation.iconColor,
        query: query,
      },
      rangeRaw: options.rangeRaw,
    };

    return this.doRequest({
      url: this.url + '/annotations',
      method: 'POST',
      data: annotationQuery,
    }).then(result => {
      return result.data;
    });
  }

  metricFindQuery(query: any) {
    const interpolated: TSDBQuery = {
      refId: 'Q',
      target: this.templateSrv.replace(query, null, 'regex'),
      datasourceId: this.id,
      queryType: 'search',
    };

    return this.doTsdbRequest({
      targets: [interpolated],
    })
      .then(response => {
        const res = handleTsdbResponse(response);
        if (res && res.data && res.data.length) {
          return res.data[0].rows;
        } else {
          return [];
        }
      })
      .then(mapToTextValue);
  }

  doRequest(options: any) {
    options.withCredentials = this.withCredentials;
    options.headers = this.headers;

    return this.backendSrv.datasourceRequest(options);
  }

  doTsdbRequest(options: TSDBRequestOptions) {
    const tsdbRequestData: TSDBRequest = {
      queries: options.targets,
    };

    if (options.range) {
      tsdbRequestData.from = options.range.from.valueOf().toString();
      tsdbRequestData.to = options.range.to.valueOf().toString();
    }

    return this.backendSrv.datasourceRequest({
      url: '/api/tsdb/query',
      method: 'POST',
      data: tsdbRequestData,
    });
  }

  buildQueryParameters(options: DataQueryRequest<TSDBQuery>): TSDBRequestOptions {
    //remove placeholder targets
    const targets = _.filter(options.targets, target => {
      return target.target !== 'select metric';
    });

    return {
      ...options,
      targets: targets.map(target => {
        return {
          queryType: 'query',
          target: this.templateSrv.replace(target.target, options.scopedVars, 'regex'),
          refId: target.refId,
          hide: target.hide,
          type: target.type || 'timeserie',
          datasourceId: this.id,
        };
      }),
    };
  }

  getTagKeys(options: any) {
    return this.doRequest({
      url: this.url + '/tag-keys',
      method: 'POST',
      data: options,
    }).then(result => {
      return result.data;
    });
  }

  getTagValues(options: any) {
    return this.doRequest({
      url: this.url + '/tag-values',
      method: 'POST',
      data: options,
    }).then(result => {
      return result.data;
    });
  }
}

export function handleTsdbResponse(response: any) {
  const res: any[] = [];
  for (const r of response.data.results) {
    for (const s of r.series) {
      res.push({
        target: s.name,
        datapoints: s.points,
        refId: r.refId,
      });
    }
    for (const t of r.tables) {
      res.push({
        ...t,
        type: 'table',
        refId: r.refId,
      });
    }
  }

  response.data = res;
  console.log(res);
  return response;
}

export function mapToTextValue(result) {
  return _.map(result, (d, i) => {
    if (d && d.text && d.value) {
      return {text: d.text, value: d.value};
    } else if (_.isObject(d)) {
      return {text: d, value: i};
    }
    return {text: d, value: d};
  });
}
