const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /server\/node_modules\/.*/,
];

module.exports = config;
