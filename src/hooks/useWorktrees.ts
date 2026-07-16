import { useCallback, useEffect, useState } from 'react';
import { getStatus, listWorktrees } from '../git.js';
import { getLabels } from '../labels.js';
import type { Worktree } from '../types.js';

export function useWorktrees(cwd: string, gitCommonDir: string) {
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, labels] = await Promise.all([listWorktrees(cwd), getLabels(gitCommonDir)]);
      const base: Worktree[] = list.map((wt) => ({ ...wt, label: labels[wt.path] }));
      setWorktrees(base);
      setLoading(false);
      const statuses = await Promise.all(
        base.map((wt) => getStatus(wt.path).catch(() => undefined)),
      );
      setWorktrees(base.map((wt, i) => ({ ...wt, status: statuses[i] })));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }, [cwd, gitCommonDir]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { worktrees, loading, error, refresh };
}
