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

render(<App cwd={cwd} gitCommonDir={gitCommonDir} />);
