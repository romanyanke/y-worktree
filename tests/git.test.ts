import { describe, expect, it } from 'vitest';
import { parseStatus, parseWorktreeList } from '../src/git.js';

describe('parseWorktreeList', () => {
  it('parses main + linked worktrees', () => {
    const out = [
      'worktree /Users/me/repo',
      'HEAD aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'branch refs/heads/main',
      '',
      'worktree /Users/me/repo-feat',
      'HEAD bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'branch refs/heads/feat/auth',
      '',
    ].join('\n');

    const wts = parseWorktreeList(out);
    expect(wts).toHaveLength(2);
    expect(wts[0]).toMatchObject({ path: '/Users/me/repo', branch: 'main', isMain: true });
    expect(wts[1]).toMatchObject({ path: '/Users/me/repo-feat', branch: 'feat/auth', isMain: false });
  });

  it('parses detached, locked and prunable states', () => {
    const out = [
      'worktree /r',
      'HEAD aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'branch refs/heads/main',
      '',
      'worktree /r-detached',
      'HEAD cccccccccccccccccccccccccccccccccccccccc',
      'detached',
      '',
      'worktree /r-locked',
      'HEAD dddddddddddddddddddddddddddddddddddddddd',
      'branch refs/heads/x',
      'locked reason here',
      '',
      'worktree /r-gone',
      'HEAD eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      'branch refs/heads/y',
      'prunable gitdir file points to non-existent location',
      '',
    ].join('\n');

    const wts = parseWorktreeList(out);
    expect(wts).toHaveLength(4);
    expect(wts[1]!.branch).toBeNull();
    expect(wts[2]!.isLocked).toBe(true);
    expect(wts[3]!.isPrunable).toBe(true);
  });

  it('handles missing trailing newline', () => {
    const out = 'worktree /r\nHEAD ' + 'a'.repeat(40) + '\nbranch refs/heads/main';
    expect(parseWorktreeList(out)).toHaveLength(1);
  });

  it('returns empty array for empty output', () => {
    expect(parseWorktreeList('')).toEqual([]);
  });
});

describe('parseStatus', () => {
  it('parses a clean status with ahead/behind', () => {
    const out = [
      '# branch.oid abc',
      '# branch.head main',
      '# branch.upstream origin/main',
      '# branch.ab +2 -1',
      '',
    ].join('\n');

    expect(parseStatus(out)).toEqual({
      dirty: false,
      staged: 0,
      modified: 0,
      untracked: 0,
      ahead: 2,
      behind: 1,
    });
  });

  it('counts staged, modified, untracked and conflicts', () => {
    const out = [
      '# branch.head feat',
      '1 M. N... 100644 100644 100644 a b staged.ts',
      '1 .M N... 100644 100644 100644 a b modified.ts',
      '1 MM N... 100644 100644 100644 a b both.ts',
      '2 R. N... 100644 100644 100644 a b R100 renamed.ts',
      'u UU N... 100644 100644 100644 100644 a b c conflict.ts',
      '? untracked.ts',
      '',
    ].join('\n');

    const status = parseStatus(out);
    expect(status.dirty).toBe(true);
    expect(status.staged).toBe(3); // staged.ts, both.ts, renamed.ts
    expect(status.modified).toBe(3); // modified.ts, both.ts, conflict.ts
    expect(status.untracked).toBe(1);
  });

  it('no upstream → ahead/behind stay 0', () => {
    const out = '# branch.oid abc\n# branch.head feat\n';
    const status = parseStatus(out);
    expect(status.ahead).toBe(0);
    expect(status.behind).toBe(0);
    expect(status.dirty).toBe(false);
  });
});
