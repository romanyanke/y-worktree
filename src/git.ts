import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import type { LastCommit, Worktree, WorktreeStatus } from './types.js';

const execFileAsync = promisify(execFile);

export async function git(args: string[], cwd?: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    const err = error as { stderr?: string; message: string };
    throw new Error(err.stderr?.trim() || err.message);
  }
}

/** Open a new terminal window in the given directory. */
export function openTerminal(path: string): void {
  if (process.platform === 'darwin') {
    spawn('open', ['-a', 'Terminal', path], { detached: true, stdio: 'ignore' }).unref();
  } else if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', 'cmd', '/k', 'cd', '/d', path], {
      detached: true,
      stdio: 'ignore',
    }).unref();
  } else {
    // Try common Linux terminal emulators in order.
    const term = process.env.TERMINAL;
    const candidates = term ? [term] : ['x-terminal-emulator', 'gnome-terminal', 'konsole', 'xterm'];
    for (const cmd of candidates) {
      try {
        spawn(cmd, ['--working-directory', path], { detached: true, stdio: 'ignore' }).unref();
        return;
      } catch {
        // try next
      }
    }
  }
}

export async function getGitCommonDir(cwd: string): Promise<string> {
  const out = await git(['rev-parse', '--path-format=absolute', '--git-common-dir'], cwd);
  return out.trim();
}

export function parseWorktreeList(porcelain: string): Omit<Worktree, 'label' | 'status'>[] {
  const worktrees: Omit<Worktree, 'label' | 'status'>[] = [];
  let current: Partial<Worktree> | null = null;

  const flush = () => {
    if (current?.path) {
      worktrees.push({
        path: current.path,
        head: current.head ?? '',
        branch: current.branch ?? null,
        isMain: worktrees.length === 0,
        isLocked: current.isLocked ?? false,
        isPrunable: current.isPrunable ?? false,
      });
    }
    current = null;
  };

  for (const line of porcelain.split('\n')) {
    if (line === '') {
      flush();
      continue;
    }
    if (line.startsWith('worktree ')) {
      flush();
      current = { path: line.slice('worktree '.length) };
    } else if (!current) {
      continue;
    } else if (line.startsWith('HEAD ')) {
      current.head = line.slice('HEAD '.length);
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice('branch '.length).replace(/^refs\/heads\//, '');
    } else if (line === 'detached') {
      current.branch = null;
    } else if (line === 'locked' || line.startsWith('locked ')) {
      current.isLocked = true;
    } else if (line === 'prunable' || line.startsWith('prunable ')) {
      current.isPrunable = true;
    }
  }
  flush();
  return worktrees;
}

export async function listWorktrees(cwd: string): Promise<Omit<Worktree, 'label' | 'status'>[]> {
  const out = await git(['worktree', 'list', '--porcelain'], cwd);
  return parseWorktreeList(out);
}

export function parseStatus(porcelain: string): WorktreeStatus {
  const status: WorktreeStatus = {
    dirty: false,
    staged: 0,
    modified: 0,
    untracked: 0,
    ahead: 0,
    behind: 0,
  };

  for (const line of porcelain.split('\n')) {
    if (line.startsWith('# branch.ab ')) {
      const match = line.match(/\+(\d+) -(\d+)/);
      if (match) {
        status.ahead = Number(match[1]);
        status.behind = Number(match[2]);
      }
    } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
      const xy = line.split(' ')[1] ?? '..';
      if (xy[0] !== '.') status.staged++;
      if (xy[1] !== '.') status.modified++;
      status.dirty = true;
    } else if (line.startsWith('u ')) {
      status.modified++;
      status.dirty = true;
    } else if (line.startsWith('? ')) {
      status.untracked++;
      status.dirty = true;
    }
  }
  return status;
}

export async function getStatus(worktreePath: string): Promise<WorktreeStatus> {
  const out = await git(['status', '--porcelain=v2', '--branch'], worktreePath);
  return parseStatus(out);
}

export async function getLastCommit(worktreePath: string): Promise<LastCommit | null> {
  try {
    const out = await git(['log', '-1', '--format=%h%x00%s%x00%cr'], worktreePath);
    const [hash, subject, relativeDate] = out.trim().split('\0');
    if (!hash) return null;
    return { hash, subject: subject ?? '', relativeDate: relativeDate ?? '' };
  } catch {
    return null; // repo without commits
  }
}

export async function removeWorktree(cwd: string, worktreePath: string, force: boolean): Promise<void> {
  const args = ['worktree', 'remove'];
  if (force) args.push('--force');
  args.push(worktreePath);
  await git(args, cwd);
}

export async function pruneWorktrees(cwd: string): Promise<void> {
  await git(['worktree', 'prune'], cwd);
}

export async function addWorktree(cwd: string, branch: string, worktreePath: string): Promise<void> {
  const branches = await git(['branch', '--list', branch], cwd);
  if (branches.trim()) {
    await git(['worktree', 'add', worktreePath, branch], cwd);
  } else {
    await git(['worktree', 'add', '-b', branch, worktreePath], cwd);
  }
}

/**
 * Check out the worktree's branch in the main worktree.
 * keepWorktree: detach the worktree's HEAD (files untouched) so the branch is freed;
 * otherwise the worktree is removed (must be clean).
 */
export async function adoptBranch(
  mainPath: string,
  worktree: Worktree,
  keepWorktree: boolean,
): Promise<void> {
  if (!worktree.branch) {
    throw new Error('Worktree is on a detached HEAD — no branch to adopt');
  }
  const mainStatus = await getStatus(mainPath);
  if (mainStatus.dirty) {
    throw new Error('Main worktree has uncommitted changes — commit or stash them first');
  }
  if (keepWorktree) {
    await git(['switch', '--detach'], worktree.path);
  } else {
    const status = await getStatus(worktree.path);
    if (status.dirty) {
      throw new Error('Worktree has uncommitted changes — keep it instead of removing, or clean it up');
    }
    await removeWorktree(mainPath, worktree.path, false);
  }
  await git(['checkout', worktree.branch], mainPath);
}
