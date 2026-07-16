import { render } from 'ink';
import { spawn } from 'node:child_process';
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

const useAltScreen = process.stdout.isTTY ?? false;
const enterAltScreen = () => {
  if (useAltScreen) process.stdout.write('\x1b[?1049h\x1b[H');
};
const leaveAltScreen = () => {
  if (useAltScreen) process.stdout.write('\x1b[?1049l');
};

let pendingShellPath: string | null = null;

/** Suspend the UI and drop into an interactive shell in `path`. */
function openShell(path: string) {
  if (!process.stdout.isTTY) return;
  pendingShellPath = path;
  app.unmount();
}

function mount() {
  enterAltScreen();
  const instance = render(<App cwd={cwd} gitCommonDir={gitCommonDir} onOpenShell={openShell} />);
  instance.waitUntilExit().then(onExit);
  return instance;
}

function onExit() {
  if (pendingShellPath) {
    const path = pendingShellPath;
    pendingShellPath = null;
    leaveAltScreen();
    // Release Node's grip on stdin so it doesn't fight the child shell for
    // the tty (concurrent reads on the same terminal raise EIO).
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
    const shell = process.env.SHELL || '/bin/sh';
    process.stdout.write(`\nywt: shell in ${path} — type \`exit\` to return\n`);
    const child = spawn(shell, [], { cwd: path, stdio: 'inherit' });
    child.on('exit', () => {
      process.stdin.resume();
      app = mount();
    });
  } else {
    leaveAltScreen();
    process.exit(0);
  }
}

let app = mount();
