// Publishes the package to npm and to GitHub Packages (npm.pkg.github.com). Each publish builds through the
// package's own lifecycle scripts (prepare / prepublishOnly).
//
//   node scripts/publish.mjs            both registries
//   node scripts/publish.mjs --npm      npm only
//   node scripts/publish.mjs --github   GitHub Packages only
//   ... --dry-run                       pack and report, publish nothing
//
// The dist-tag is the version's prerelease name (8.0.0-dev.8 → `dev`), or `latest` for a release.
//
// npm uses your normal npm login. GitHub Packages uses GITHUB_TOKEN (or NODE_AUTH_TOKEN) if set, else
// `gh auth token`; the token needs the `write:packages` scope (`gh auth refresh -s write:packages,read:packages`).
// It is written to a temporary npmrc for the one command, never to the repo or ~/.npmrc.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const GITHUB_REGISTRY = 'https://npm.pkg.github.com';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const onlyNpm = args.has('--npm');
const onlyGithub = args.has('--github');
const toNpm = onlyNpm || !onlyGithub;
const toGithub = onlyGithub || !onlyNpm;

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const { name, version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const prerelease = /^\d+\.\d+\.\d+-([0-9A-Za-z-]+)/.exec(version);
const tag = prerelease ? prerelease[1] : 'latest';

function run (cmd, cmdArgs, options = {}) {
  console.log(`$ ${ cmd } ${ cmdArgs.join(' ') }`);
  execFileSync(cmd, cmdArgs, { cwd: root, stdio: 'inherit', ...options });
}

function githubToken () {
  const fromEnv = process.env.GITHUB_TOKEN || process.env.NODE_AUTH_TOKEN;
  if (fromEnv) return fromEnv;
  try {
    return execFileSync('gh', [ 'auth', 'token' ], { encoding: 'utf8' }).trim();
  } catch {
    throw new Error('No GitHub token: set GITHUB_TOKEN, or log in with `gh auth login`.');
  }
}

console.log(`${ name }@${ version } → tag "${ tag }"${ dryRun ? ' (dry run)' : '' }`);

const publishArgs = [ 'publish', '--tag', tag, ...(dryRun ? [ '--dry-run' ] : []) ];

if (toNpm) {
  run('npm', [ ...publishArgs, '--registry', 'https://registry.npmjs.org' ]);
}

if (toGithub) {
  const dir = mkdtempSync(path.join(tmpdir(), 'publish-github-'));
  const npmrc = path.join(dir, '.npmrc');
  try {
    writeFileSync(npmrc, [
      `@lunarraid:registry=${ GITHUB_REGISTRY }`,
      `//npm.pkg.github.com/:_authToken=${ githubToken() }`,
      ''
    ].join('\n'), { mode: 0o600 });
    run('npm', [ ...publishArgs, '--registry', GITHUB_REGISTRY, '--userconfig', npmrc ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
