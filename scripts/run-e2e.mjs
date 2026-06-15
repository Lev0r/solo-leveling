import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const localLibDir = join(process.cwd(), '.playwright-libs/usr/lib/x86_64-linux-gnu');
const env = { ...process.env };

if (existsSync(join(localLibDir, 'libnspr4.so'))) {
  env.LD_LIBRARY_PATH = `${localLibDir}:${env.LD_LIBRARY_PATH ?? ''}`;
}

const result = spawnSync('playwright', ['test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
});

process.exit(result.status ?? 1);
