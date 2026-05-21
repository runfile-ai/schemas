/**
 * CI drift check: regenerate downstream artifacts, fail if anything in tracked
 * generated/ files differs from what's committed. Catches "I edited Zod but
 * forgot to regenerate."
 *
 * Uses `git diff` (working tree vs index) rather than `git status` — the latter
 * incorrectly flags untracked-but-staged files on the very first commit. We only
 * care about modifications to tracked files.
 */
import { execSync, spawnSync } from 'node:child_process';

execSync('pnpm run generate', { stdio: 'inherit' });

const diff = spawnSync('git', ['diff', '--exit-code', '--', 'generated/'], { encoding: 'utf-8' });
if (diff.status !== 0) {
  console.error('\nGenerated artifacts are out of date.');
  console.error('Run `pnpm run generate` locally and commit the result.\n');
  console.error('Changed files:');
  console.error(diff.stdout);
  process.exit(1);
}

console.log('Generated artifacts match the Zod source. No drift.');
