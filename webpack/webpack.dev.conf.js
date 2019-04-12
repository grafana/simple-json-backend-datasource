const baseWebpackConfig = require('./webpack.base.conf');

var conf = baseWebpackConfig;
conf.watch = false;
conf.mode = 'development';

module.exports = baseWebpackConfig;
