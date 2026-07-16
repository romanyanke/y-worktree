export interface Worktree {
  path: string;
  head: string;
  branch: string | null; // null = detached HEAD
  isMain: boolean;
  isLocked: boolean;
  isPrunable: boolean;
  label?: string;
  status?: WorktreeStatus;
}

export interface WorktreeStatus {
  dirty: boolean;
  staged: number;
  modified: number;
  untracked: number;
  ahead: number;
  behind: number;
}

export interface LastCommit {
  hash: string;
  subject: string;
  relativeDate: string;
}
