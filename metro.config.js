const { getDefaultConfig } = require("expo/metro-config");
const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

function resolveModule(name) {
  const localPath = path.resolve(projectRoot, "node_modules", name);
  if (fs.existsSync(localPath)) return localPath;
  return path.resolve(workspaceRoot, "node_modules", name);
}

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  react: resolveModule("react"),
  "react-native": resolveModule("react-native"),
  "@hugeicons/react-native": resolveModule("@hugeicons/react-native"),
  "@hugeicons/core-free-icons": resolveModule("@hugeicons/core-free-icons"),
};

module.exports = config;