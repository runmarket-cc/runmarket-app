const fs = require('node:fs');
const path = require('node:path');

function prepareEasVersion(root, version, profile) {
  if (!/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(version ?? '')) {
    throw new Error('APP_VERSION must be a numeric major.minor.patch version');
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (pkg.version !== version) {
    throw new Error('package.json version differs from APP_VERSION; apply npm version first');
  }
  const file = path.join(root, 'eas.json');
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Object.hasOwn(config.build ?? {}, profile ?? '')) {
    throw new Error('Unknown BUILD_PROFILE');
  }
  config.build[profile].env = { ...config.build[profile].env, APP_VERSION: version };
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
}

if (require.main === module) {
  prepareEasVersion(process.cwd(), process.env.APP_VERSION, process.env.BUILD_PROFILE);
}
module.exports = { prepareEasVersion };
