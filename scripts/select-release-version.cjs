const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function parseVersion(value) {
  const match = VERSION.exec(value ?? '');
  if (!match) throw new Error('App version must contain three numeric components, for example 1.1.10');
  return match.slice(1).map(Number);
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function selectReleaseVersion({ requested, runNumber, packageVersion, tags, guardIosSubmission }) {
  const current = parseVersion(packageVersion);
  const releases = tags
    .filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag))
    .map((tag) => parseVersion(tag.slice(1)));
  const latest = releases.reduce(
    (highest, version) => (!highest || compareVersions(version, highest) > 0 ? version : highest),
    null,
  );

  if (requested) {
    const version = parseVersion(requested);
    if (guardIosSubmission && latest && compareVersions(version, latest) <= 0) {
      throw new Error(`iOS release version must be newer than the latest release tag v${latest.join('.')}`);
    }
    return requested;
  }

  const patch = Number(runNumber);
  if (!Number.isSafeInteger(patch) || patch < 1) throw new Error('GITHUB_RUN_NUMBER must be a positive integer');
  const baseline = latest && compareVersions(latest, current) > 0 ? latest : current;
  const version = [baseline[0], baseline[1], patch];
  if (compareVersions(version, baseline) <= 0) {
    version[1] += 1;
  }
  return version.join('.');
}

if (require.main === module) {
  try {
    const packageVersion = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')).version;
    const tags = execFileSync('git', ['tag', '--list'], { encoding: 'utf8' }).split(/\r?\n/);
    const version = selectReleaseVersion({
      requested: process.env.REQUESTED_APP_VERSION,
      runNumber: process.env.GITHUB_RUN_NUMBER,
      packageVersion,
      tags,
      guardIosSubmission: process.env.GUARD_IOS_SUBMISSION === 'true',
    });
    process.stdout.write(`${version}\n`);
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { selectReleaseVersion };
