/**
 * Local publish-all — ship a full release from your laptop (npm + PyPI + Git tag).
 *
 * Normal release path is the `release.yml` GitHub Actions workflow, triggered by
 * pushing a `v*` tag. This script is the manual fallback for when CI is broken
 * mid-publish, or for dry-running a release before tagging.
 *
 *   pnpm run publish-all              # full publish
 *   pnpm run publish-all -- --dry-run # print steps; npm runs with --dry-run; PyPI is skipped
 *
 * Pre-flight checks:
 *   - Working tree clean (no uncommitted changes)
 *   - Current commit tagged v<version> matching package.json#version
 *   - generate + check-drift + test + build all pass
 *
 * Auth required for a real publish:
 *   - npm: `npm login` (or NODE_AUTH_TOKEN env var)
 *   - PyPI: a `~/.pypirc` token, or PYPI_API_TOKEN env var (twine reads both)
 *   - GitHub: `git push origin <tag>` for the Go consumer-visible tag
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

function run(cmd: string): void {
  console.log(`\n$ ${cmd}`);
  if (DRY_RUN) return;
  execSync(cmd, { stdio: 'inherit', cwd: REPO_ROOT });
}

function readVersion(): string {
  return (
    JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8')) as { version: string }
  ).version;
}

function ensureCleanTree(): void {
  const status = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf8' });
  if (status.trim().length > 0) {
    console.error('Working tree is dirty. Commit or stash before publishing.\n');
    console.error(status);
    process.exit(1);
  }
}

function ensureCurrentCommitTagged(version: string): void {
  const expected = `v${version}`;
  const tags = execSync('git tag --points-at HEAD', { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);
  if (!tags.includes(expected)) {
    console.error(
      `HEAD is not tagged ${expected}. Tag and push it first:\n` +
        `  git tag ${expected} && git push origin ${expected}`,
    );
    process.exit(1);
  }
}

function ensurePythonBuild(): void {
  try {
    execSync('python3 -c "import build"', { stdio: 'ignore' });
  } catch {
    console.error('Python `build` module not found. Install: pip3 install --user build twine');
    process.exit(1);
  }
}

console.log(`Runfile schemas publish-all${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

const version = readVersion();
console.log(`Version: ${version}`);

if (!DRY_RUN) {
  ensureCleanTree();
  ensureCurrentCommitTagged(version);
  ensurePythonBuild();
}

// 1. Regenerate + verify everything passes.
run('pnpm run generate');
run('pnpm run check-drift');
run('pnpm test');
run('pnpm run build');

// 2. npm — publish @runfile-ai/schemas
run(`pnpm publish --access public${DRY_RUN ? ' --dry-run' : ''}`);

// 3. PyPI — build wheel + sdist from generated/python/, upload via twine
run('python3 -m build generated/python');
if (DRY_RUN) {
  console.log('\n(dry run: skipping `twine upload`)');
} else {
  run(`python3 -m twine upload generated/python/dist/runfile_ai_schemas-${version}*`);
}

// 4. Go — no upload, but the v<version> tag must be pushed for consumers to fetch.
//    The pre-flight already verified the tag exists locally; ensure it's on origin too.
if (!DRY_RUN) {
  const remoteTags = execSync(`git ls-remote --tags origin v${version}`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  if (!remoteTags.includes(`refs/tags/v${version}`)) {
    console.warn(
      `\nv${version} is not yet on origin. Push it so Go consumers can fetch:\n` +
        `  git push origin v${version}`,
    );
  } else {
    console.log(`\nGo consumers can now \`go get github.com/runfile-ai/schemas@v${version}\`.`);
  }
}

console.log(`\nDone${DRY_RUN ? ' (dry run — nothing was actually published)' : ''}.`);

// Touch a fs symbol so tooling doesn't warn on unused import in edge configs.
void existsSync;
