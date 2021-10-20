## Simple JSON Datasource - a generic backend datasource

> This plugin is **no longer maintained** by the Grafana team.
>
> If you're looking for an example of a data source plugin, refer to [grafana-starter-datasource-backend](https://github.com/grafana/grafana-starter-datasource-backend).
>
> If you're using this plugin, check out a couple of alternatives:
>
> - [JSON](https://grafana.com/grafana/plugins/simpod-json-datasource) by Šimon Podlipský
> - [JSON API](https://grafana.com/grafana/plugins/marcusolsson-json-datasource) by Marcus Olsson
>
More documentation about datasource plugins can be found in the [Docs](https://grafana.com/docs/grafana/latest/developers/plugins/).

This also serves as a living example implementation of a datasource.

Your backend needs to implement 4 urls:

 * `/` should return 200 ok. Used for "Test connection" on the datasource config page.
 * `/search` used by the find metric options on the query tab in panels.
 * `/query` should return metrics based on input.
 * `/annotations` should return annotations.

## Installation

To install this plugin using the `grafana-cli` tool:
```
sudo grafana-cli plugins install grafana-simple-json-datasource
sudo service grafana-server restart
```
See [here](https://grafana.com/plugins/grafana-simple-json-datasource/installation) for more
information.

### Example backend implementations
- https://github.com/bergquist/fake-simple-json-datasource
- https://github.com/smcquay/jsonds

### Query API

Example `timeserie` request
``` javascript
{
  "panelId": 1,
  "range": {
    "from": "2016-10-31T06:33:44.866Z",
    "to": "2016-10-31T12:33:44.866Z",
    "raw": {
      "from": "now-6h",
      "to": "now"
    }
  },
  "rangeRaw": {
    "from": "now-6h",
    "to": "now"
  },
  "interval": "30s",
  "intervalMs": 30000,
  "targets": [
     { "target": "upper_50", "refId": "A", "type": "timeserie" },
     { "target": "upper_75", "refId": "B", "type": "timeserie" }
  ],
  "format": "json",
  "maxDataPoints": 550
}
```

Example `timeserie` response
``` javascript
[
  {
    "target":"upper_75", // The field being queried for
    "datapoints":[
      [622,1450754160000],  // Metric value as a float , unixtimestamp in milliseconds
      [365,1450754220000]
    ]
  },
  {
    "target":"upper_90",
    "datapoints":[
      [861,1450754160000],
      [767,1450754220000]
    ]
  }
]
```

If the metric selected is `"type": "table"`, an example `table` response:
```json
[
  {
    "columns":[
      {"text":"Time","type":"time"},
      {"text":"Country","type":"string"},
      {"text":"Number","type":"number"}
    ],
    "rows":[
      [1234567,"SE",123],
      [1234567,"DE",231],
      [1234567,"US",321]
    ],
    "type":"table"
  }
]
```

### Annotation API

The annotation request from the Simple JSON Datasource is a POST request to
the /annotations endpoint in your datasource. The JSON request body looks like this:
``` javascript
{
  "range": {
    "from": "2016-04-15T13:44:39.070Z",
    "to": "2016-04-15T14:44:39.070Z"
  },
  "rangeRaw": {
    "from": "now-1h",
    "to": "now"
  },
  "annotation": {
    "name": "deploy",
    "datasource": "Simple JSON Datasource",
    "iconColor": "rgba(255, 96, 96, 1)",
    "enable": true,
    "query": "#deploy"
  }
}
```

Grafana expects a response containing an array of annotation objects in the
following format:

``` javascript
[
  {
    annotation: annotation, // The original annotation sent from Grafana.
    time: time, // Time since UNIX Epoch in milliseconds. (required)
    title: title, // The title for the annotation tooltip. (required)
    tags: tags, // Tags for the annotation. (optional)
    text: text // Text for the annotation. (optional)
  }
]
```

Note: If the datasource is configured to connect directly to the backend, you
also need to implement an OPTIONS endpoint at /annotations that responds
with the correct CORS headers:

```
Access-Control-Allow-Headers:accept, content-type
Access-Control-Allow-Methods:POST
Access-Control-Allow-Origin:*
```

### Search API

Example request
``` javascript
{ target: 'upper_50' }
```

The search api can either return an array or map.

Example array response
``` javascript
["upper_25","upper_50","upper_75","upper_90","upper_95"]
```

Example map response
``` javascript
[ { "text" :"upper_25", "value": 1}, { "text" :"upper_75", "value": 2} ]
```

### Dev setup

This plugin requires node 6.10.0

```sh
npm install -g yarn
yarn install --pure-lockfile
make
```

#### Running fake JSON server

```sh
cd devenv
docker-compose up -d
```
This will build and run fake sever on the `http://localhost:3333`.

### Changelog

1.3.5
- Fix for dropdowns in query editor to allow writing template variables (broke due to change in Grafana).

1.3.4
- Adds support for With Credentials (sends grafana cookies with request) when using Direct mode
- Fix for the typeahead component for metrics dropdown (/search endpoint).

1.3.3
 - Adds support for basic authentication

1.2.4
 - Add support returning sets in the search endpoint

1.2.3
 - Allow nested templates in find metric query. #23

1.2.2
 - Dont execute hidden queries
 - Template support for metrics queries
 - Template support for annotation queries

### If using Grafana 2.6
NOTE!
for grafana 2.6 please use [this version](https://github.com/grafana/simple-json-datasource/commit/b78720f6e00c115203d8f4c0e81ccd3c16001f94)

Copy the data source you want to /public/app/plugins/datasource/. Then restart grafana-server. The new data source should now be available in the data source type dropdown in the Add Data Source View.
