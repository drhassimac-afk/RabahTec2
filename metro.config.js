const { getDefaultConfig } = require('expo/metro-config');
const resolveFrom = require('resolve-from');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /server\/node_modules\/.*/,
];

// مطلوب من طرف react-native-webrtc: React Native يستعمل event-target-shim@5
// لكن react-native-webrtc يحتاج النسخة 6 — هذا يوجّه الاستيراد للنسخة الصحيحة فقط داخل مكتبة webrtc
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.startsWith('event-target-shim') &&
    context.originModulePath.includes('react-native-webrtc')
  ) {
    const eventTargetShimPath = resolveFrom(context.originModulePath, moduleName);
    return { filePath: eventTargetShimPath, type: 'sourceFile' };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
