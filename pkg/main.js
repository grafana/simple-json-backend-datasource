#!/usr/bin/env node
var path = require('path');
var fs = require('fs');
var parseArgs = require('minimist');
var path = require('path');
var _ = require('lodash');
var grpc = require('grpc');
var protoLoader = require('@grpc/proto-loader');

var PROTO_PATH = path.join(__dirname, 'proto/datasource.proto');
var packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
var models = grpc.loadPackageDefinition(packageDefinition).models
const log = require('simple-node-logger').createSimpleLogger('C:\\Users\\stephanie\\tmp\\simplejson.log');
log.info("created logger");

function query(request, callback) {
  // Returns DataQueryResponse
  log.info("request", request, callback);
}

class SimpleJsonBackend extends models.DatasourcePlugin {
}

function getServer() {
  var server = new grpc.Server();
  server.addService(models.DatasourcePlugin.service, {
    query: query,
  });
  return server;
}

function main() {
  if (require.main === module) {
    var server = getServer();

    // If this is run as a script, start a server on an unused port
    server.bind('0.0.0.0:6061', grpc.ServerCredentials.createInsecure());
    log.info("starting server");
    server.start();
  }
}

main();
