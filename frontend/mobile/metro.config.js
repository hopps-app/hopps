const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

// Get the default Metro configuration
let config = getDefaultConfig(__dirname);


// Export the combined configuration
module.exports = withNativeWind(config, { input: './global.css' });