import { render } from 'ink';
import { App } from './app.js';
import { getGitCommonDir } from './git.js';

const cwd = process.cwd();

let gitCommonDir: string;
try {
  gitCommonDir = await getGitCommonDir(cwd);
} catch {
  console.error('ywt: not a git repository (run it inside a repo or worktree)');
  process.exit(1);
}

const useAltScreen = process.stdout.isTTY;
if (useAltScreen) {
  // Alternate screen buffer: full-screen UI that vanishes from scrollback on exit
  process.stdout.write('\x1b[?1049h\x1b[H');
}

const app = render(<App cwd={cwd} gitCommonDir={gitCommonDir} />);
await app.waitUntilExit();

if (useAltScreen) {
  process.stdout.write('\x1b[?1049l');
}
