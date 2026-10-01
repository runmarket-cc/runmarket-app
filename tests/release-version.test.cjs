const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { setVersion } = require('@expo/config-plugins/build/ios/Version');
const yaml = require('yaml');
const { prepareEasVersion } = require('../scripts/prepare-eas-version.cjs');
const { selectReleaseVersion } = require('../scripts/select-release-version.cjs');

const appSource = fs.readFileSync(path.join(__dirname, '../app.config.js'), 'utf8');
function appVersion(env, packageVersion) {
  const context = { module: { exports: {} }, process: { env }, require: () => ({ version: packageVersion }) };
  vm.runInNewContext(appSource, context);
  return context.module.exports.expo.version;
}

test('remote config without GitHub environment uses uploaded package version', () => {
  assert.equal(appVersion({}, '1.0.10'), '1.0.10');
  assert.equal(appVersion({ GITHUB_RUN_NUMBER: '9' }, '2.0.0'), '2.0.0');
});
test('explicit build version takes precedence', () => {
  assert.equal(appVersion({ APP_VERSION: '2.1.0' }, '1.0.1'), '2.1.0');
});

test('automatic version exceeds existing release tags and differs across runs', () => {
  const base = { packageVersion: '1.0.1', tags: ['v1.1.1', 'v1.1.1-preview'] };
  assert.equal(selectReleaseVersion({ ...base, runNumber: '10' }), '1.1.10');
  assert.equal(selectReleaseVersion({ ...base, runNumber: '11' }), '1.1.11');
  assert.equal(selectReleaseVersion({ ...base, runNumber: '2', tags: ['v1.1.50'] }), '1.2.2');
  assert.equal(selectReleaseVersion({ packageVersion: '2.0.0', tags: [], runNumber: '10' }), '2.0.10');
});

test('manual iOS submission rejects versions at or below released tag', () => {
  const base = { packageVersion: '1.0.1', tags: ['v1.1.1'], runNumber: '10', guardIosSubmission: true };
  assert.throws(() => selectReleaseVersion({ ...base, requested: '1.1.1' }), /newer than/);
  assert.throws(() => selectReleaseVersion({ ...base, requested: '1.0.10' }), /newer than/);
  assert.equal(selectReleaseVersion({ ...base, requested: '1.1.2' }), '1.1.2');
  assert.equal(selectReleaseVersion({ ...base, requested: '1.1.1', guardIosSubmission: false }), '1.1.1');
  assert.throws(() => selectReleaseVersion({ ...base, requested: '1.1.2-beta' }), /three numeric/);
});
test('selected EAS profile receives version and preserves other configuration', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runmarket-release-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '1.0.10' }));
  const file = path.join(root, 'eas.json');
  const config = { build: { production: { autoIncrement: true, env: { EXISTING: 'kept' } }, preview: { distribution: 'internal' } } };
  fs.writeFileSync(file, JSON.stringify(config));
  prepareEasVersion(root, '1.0.10', 'production');
  const result = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(result.build.production, { autoIncrement: true, env: { EXISTING: 'kept', APP_VERSION: '1.0.10' } });
  assert.deepEqual(result.build.preview, config.build.preview);
  const resolvedVersion = appVersion(result.build.production.env, '1.0.10');
  assert.equal(resolvedVersion, '1.0.10');
  assert.equal(setVersion({ version: resolvedVersion }, {}).CFBundleShortVersionString, '1.0.10');
  const before = fs.readFileSync(file, 'utf8');
  assert.throws(() => prepareEasVersion(root, '1.0.10-beta', 'production'));
  assert.throws(() => prepareEasVersion(root, '1.0.10', 'missing'));
  assert.throws(() => prepareEasVersion(root, '1.0.11', 'production'));
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});

test('all selected profiles carry the same version with GitHub environment absent', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runmarket-profiles-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const original = fs.readFileSync(path.join(__dirname, '../eas.json'), 'utf8');
  for (const profile of ['production', 'preview', 'development']) {
    fs.writeFileSync(path.join(root, 'eas.json'), original);
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '1.0.10' }));
    prepareEasVersion(root, '1.0.10', profile);
    const prepared = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
    const version = appVersion(prepared.build[profile].env, '1.0.10');
    assert.equal(setVersion({ version }, {}).CFBundleShortVersionString, '1.0.10');
  }
});

test('workflow runs release regression checks and preserves remote build-number increment', () => {
  const workflow = yaml.parse(fs.readFileSync(path.join(__dirname, '../.github/workflows/deploy.yml'), 'utf8'));
  const steps = workflow.jobs['build-and-deploy'].steps;
  const checkout = steps.find((s) => s.uses === 'actions/checkout@v4');
  assert.equal(checkout.with['fetch-depth'], 0);
  assert.ok(steps.some((s) => s.run === 'node tests/release-version.test.cjs'));
  const prepare = steps.find((s) => s.id === 'version');
  assert.equal(prepare.env.REQUESTED_APP_VERSION, '${{ inputs.app_version }}');
  assert.equal(prepare.env.BUILD_PROFILE, '${{ inputs.profile }}');
  assert.ok(prepare.run.includes('GITHUB_RUN_ATTEMPT'));
  assert.ok(prepare.run.includes('select-release-version.cjs'));
  assert.ok(prepare.run.includes('prepare-eas-version.cjs'));
  const eas = JSON.parse(fs.readFileSync(path.join(__dirname, '../eas.json'), 'utf8'));
  assert.equal(eas.cli.appVersionSource, 'remote');
  assert.equal(eas.build.production.autoIncrement, true);
});
