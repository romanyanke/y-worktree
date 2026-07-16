import { Box, useApp, useInput } from 'ink';
import { basename, resolve } from 'node:path';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from './components/ConfirmDialog.js';
import { DetailsPane } from './components/DetailsPane.js';
import { HelpDialog } from './components/HelpDialog.js';
import { StatusBar } from './components/StatusBar.js';
import { TextPrompt } from './components/TextPrompt.js';
import { WorktreeList } from './components/WorktreeList.js';
import { addWorktree, adoptBranch, pruneWorktrees, removeWorktree } from './git.js';
import { pruneLabels, removeLabel, setLabel } from './labels.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';
import { useWorktrees } from './hooks/useWorktrees.js';
import type { Worktree } from './types.js';

type Mode =
  | { kind: 'list' }
  | { kind: 'help' }
  | { kind: 'filter' }
  | { kind: 'label'; worktree: Worktree }
  | { kind: 'newBranch' }
  | { kind: 'newPath'; branch: string }
  | { kind: 'confirmDelete'; targets: Worktree[] }
  | { kind: 'confirmForceDelete'; targets: Worktree[] }
  | { kind: 'confirmAdopt'; worktree: Worktree };

interface Props {
  cwd: string;
  gitCommonDir: string;
  onOpenShell: (path: string) => void;
}

export function App({ cwd, gitCommonDir, onOpenShell }: Props) {
  const { exit } = useApp();
  const { columns, rows } = useTerminalSize();
  const { worktrees, loading, error, refresh } = useWorktrees(cwd, gitCommonDir);
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [message, setMessage] = useState<{ text: string; color: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const mainWorktree = worktrees.find((wt) => wt.isMain);
  const repoName = mainWorktree ? basename(mainWorktree.path) : basename(cwd);

  const visible = useMemo(() => {
    if (!filter) return worktrees;
    const q = filter.toLowerCase();
    return worktrees.filter(
      (wt) =>
        wt.path.toLowerCase().includes(q) ||
        (wt.branch ?? '').toLowerCase().includes(q) ||
        (wt.label ?? '').toLowerCase().includes(q),
    );
  }, [worktrees, filter]);

  const clampedCursor = Math.min(cursor, Math.max(0, visible.length - 1));
  const current = visible[clampedCursor];

  const notify = (text: string, color = 'yellow') => setMessage({ text, color });

  const runOp = async (op: () => Promise<void>, successMessage: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await op();
      notify(successMessage, 'green');
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'red');
    } finally {
      setBusy(false);
      setSelected(new Set());
      await refresh();
    }
  };

  const deleteTargets = (): Worktree[] => {
    const marked = visible.filter((wt) => selected.has(wt.path) && !wt.isMain);
    if (marked.length > 0) return marked;
    return current && !current.isMain ? [current] : [];
  };

  useInput(
    (input, key) => {
      if (busy) return;
      if (message) setMessage(null);
      if (input === 'q' || key.escape) {
        if (filter) {
          setFilter('');
          return;
        }
        exit();
      } else if (key.upArrow || /^k+$/.test(input)) {
        setCursor(Math.max(0, clampedCursor - input.length));
      } else if (key.downArrow || /^j+$/.test(input)) {
        setCursor(Math.min(visible.length - 1, clampedCursor + input.length));
      } else if (input === ' ') {
        if (!current || current.isMain) return;
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(current.path)) next.delete(current.path);
          else next.add(current.path);
          return next;
        });
        setCursor(Math.min(visible.length - 1, clampedCursor + 1));
      } else if (input === 'd') {
        const targets = deleteTargets();
        if (targets.length === 0) {
          notify('Nothing to delete (main worktree is protected)');
          return;
        }
        setMode({ kind: 'confirmDelete', targets });
      } else if (input === 'm') {
        if (!current || current.isMain) {
          notify('Select a non-main worktree to adopt its branch');
          return;
        }
        if (!current.branch) {
          notify('Worktree is on a detached HEAD — no branch to adopt', 'red');
          return;
        }
        setMode({ kind: 'confirmAdopt', worktree: current });
      } else if (input === 'l') {
        if (!current) return;
        setMode({ kind: 'label', worktree: current });
      } else if (input === 'n') {
        setMode({ kind: 'newBranch' });
      } else if (input === '/') {
        setMode({ kind: 'filter' });
      } else if (input === '?') {
        setMode({ kind: 'help' });
      } else if (input === 'o') {
        if (!current) return;
        onOpenShell(current.path);
      } else if (input === 'p') {
        void runOp(async () => {
          await pruneWorktrees(cwd);
          const remaining = worktrees.filter((wt) => !wt.isPrunable).map((wt) => wt.path);
          await pruneLabels(gitCommonDir, remaining);
        }, 'Pruned stale worktrees');
      } else if (input === 'r') {
        void refresh();
      }
    },
    { isActive: mode.kind === 'list' },
  );

  const closeDialog = () => setMode({ kind: 'list' });

  const listWidth = Math.max(40, Math.floor(columns * 0.55));

  // One line short of the terminal height: if output reaches the full height,
  // Ink falls back to clear-screen-per-frame rendering, which flickers.
  return (
    <Box flexDirection="column" width={columns} height={rows - 1}>
      <Box flexGrow={1}>
        <WorktreeList
          worktrees={visible}
          cursor={clampedCursor}
          selected={selected}
          repoName={repoName}
          filter={filter}
          width={listWidth}
        />
        <DetailsPane worktree={current} />
      </Box>

      {mode.kind === 'help' && <HelpDialog onClose={closeDialog} />}

      {mode.kind === 'filter' && (
        <TextPrompt
          title="Filter worktrees"
          initialValue={filter}
          hint="matches label, branch and path · enter apply · esc cancel"
          onSubmit={(value) => {
            setFilter(value.trim());
            setCursor(0);
            closeDialog();
          }}
          onCancel={closeDialog}
        />
      )}

      {mode.kind === 'label' && (
        <TextPrompt
          title={`Label for ${mode.worktree.branch ?? mode.worktree.path}`}
          initialValue={mode.worktree.label ?? ''}
          hint="empty removes the label · enter confirm · esc cancel"
          onSubmit={(value) => {
            closeDialog();
            void runOp(
              () => setLabel(gitCommonDir, mode.worktree.path, value),
              value.trim() ? `Label set: ${value.trim()}` : 'Label removed',
            );
          }}
          onCancel={closeDialog}
        />
      )}

      {mode.kind === 'newBranch' && (
        <TextPrompt
          title="New worktree — branch name"
          hint="existing or new branch · enter confirm · esc cancel"
          onSubmit={(value) => {
            const branch = value.trim();
            if (!branch) {
              closeDialog();
              return;
            }
            setMode({ kind: 'newPath', branch });
          }}
          onCancel={closeDialog}
        />
      )}

      {mode.kind === 'newPath' && (
        <TextPrompt
          title={`New worktree for "${mode.branch}" — path`}
          initialValue={resolve(cwd, '..', `${repoName}-${mode.branch.replace(/\//g, '-')}`)}
          onSubmit={(value) => {
            const path = value.trim();
            closeDialog();
            if (!path) return;
            void runOp(() => addWorktree(cwd, mode.branch, path), `Worktree created: ${path}`);
          }}
          onCancel={closeDialog}
        />
      )}

      {mode.kind === 'confirmDelete' && (
        <ConfirmDialog
          title={`Delete ${mode.targets.length} worktree(s)?`}
          lines={mode.targets.map((wt) => `${wt.label ?? wt.branch ?? wt.head.slice(0, 7)}  ${wt.path}`)}
          options={[
            { key: 'y', label: 'Delete', color: 'red' },
            { key: 'n', label: 'Cancel' },
          ]}
          onSelect={(key) => {
            closeDialog();
            if (key !== 'y') return;
            const dirty = mode.targets.filter((wt) => wt.status?.dirty);
            if (dirty.length > 0) {
              setMode({ kind: 'confirmForceDelete', targets: mode.targets });
              return;
            }
            void runOp(async () => {
              for (const wt of mode.targets) {
                await removeWorktree(cwd, wt.path, false);
                await removeLabel(gitCommonDir, wt.path);
              }
            }, `Deleted ${mode.targets.length} worktree(s)`);
          }}
          onCancel={closeDialog}
        />
      )}

      {mode.kind === 'confirmForceDelete' && (
        <ConfirmDialog
          title="Some worktrees have uncommitted changes!"
          lines={mode.targets
            .filter((wt) => wt.status?.dirty)
            .map((wt) => `${wt.label ?? wt.branch ?? wt.head.slice(0, 7)}  ${wt.path}`)}
          options={[
            { key: 'f', label: 'Force delete (changes will be LOST)', color: 'red' },
            { key: 'n', label: 'Cancel' },
          ]}
          onSelect={(key) => {
            closeDialog();
            if (key !== 'f') return;
            void runOp(async () => {
              for (const wt of mode.targets) {
                await removeWorktree(cwd, wt.path, true);
                await removeLabel(gitCommonDir, wt.path);
              }
            }, `Force-deleted ${mode.targets.length} worktree(s)`);
          }}
          onCancel={closeDialog}
        />
      )}

      {mode.kind === 'confirmAdopt' && mainWorktree && (
        <ConfirmDialog
          title={`Adopt branch "${mode.worktree.branch}" into ${mainWorktree.path}?`}
          lines={[`Worktree: ${mode.worktree.path}`]}
          options={[
            { key: 'k', label: 'Adopt and KEEP worktree (detached HEAD)', color: 'green' },
            { key: 'd', label: 'Adopt and DELETE worktree', color: 'red' },
            { key: 'n', label: 'Cancel' },
          ]}
          onSelect={(key) => {
            closeDialog();
            if (key !== 'k' && key !== 'd') return;
            const keep = key === 'k';
            void runOp(async () => {
              await adoptBranch(mainWorktree.path, mode.worktree, keep);
              if (!keep) await removeLabel(gitCommonDir, mode.worktree.path);
            }, `Branch "${mode.worktree.branch}" checked out in main repo`);
          }}
          onCancel={closeDialog}
        />
      )}

      <StatusBar
        message={
          busy
            ? 'Working…'
            : error
              ? error
              : loading
                ? 'Loading worktrees…'
                : (message?.text ?? null)
        }
        messageColor={busy || loading ? 'cyan' : error ? 'red' : message?.color}
        selectedCount={selected.size}
      />
    </Box>
  );
}
