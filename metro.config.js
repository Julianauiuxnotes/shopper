const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Let .svg files import as React components (Figma-exported icons/logos),
// while everything else keeps the default asset pipeline.
const { transformer, resolver } = config;
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
  // Figma's shader runtime (lib/custom-effect-runtime, kept exactly as
  // Figma ships it) imports its own TypeScript files with a ".js"
  // extension, which Metro doesn't map back to .ts/.tsx. Inside that
  // folder only, retry such an import without the extension.
  resolveRequest: (context, moduleName, platform) => {
    const fromRuntime = context.originModulePath.includes('/lib/custom-effect-runtime/');
    if (fromRuntime && moduleName.startsWith('.') && moduleName.endsWith('.js')) {
      return context.resolveRequest(context, moduleName.slice(0, -3), platform);
    }
    return (resolver.resolveRequest ?? context.resolveRequest)(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
