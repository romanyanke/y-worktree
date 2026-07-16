import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export type Labels = Record<string, string>;

function labelsFile(gitCommonDir: string): string {
  return join(gitCommonDir, 'ywt-labels.json');
}

export async function getLabels(gitCommonDir: string): Promise<Labels> {
  try {
    const raw = await readFile(labelsFile(gitCommonDir), 'utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

async function saveLabels(gitCommonDir: string, labels: Labels): Promise<void> {
  await writeFile(labelsFile(gitCommonDir), JSON.stringify(labels, null, 2) + '\n', 'utf8');
}

export async function setLabel(gitCommonDir: string, worktreePath: string, label: string): Promise<void> {
  const labels = await getLabels(gitCommonDir);
  const trimmed = label.trim();
  if (trimmed) {
    labels[worktreePath] = trimmed;
  } else {
    delete labels[worktreePath];
  }
  await saveLabels(gitCommonDir, labels);
}

export async function removeLabel(gitCommonDir: string, worktreePath: string): Promise<void> {
  await setLabel(gitCommonDir, worktreePath, '');
}

/** Drop label entries whose worktree no longer exists. */
export async function pruneLabels(gitCommonDir: string, existingPaths: string[]): Promise<void> {
  const labels = await getLabels(gitCommonDir);
  const existing = new Set(existingPaths);
  let changed = false;
  for (const path of Object.keys(labels)) {
    if (!existing.has(path)) {
      delete labels[path];
      changed = true;
    }
  }
  if (changed) await saveLabels(gitCommonDir, labels);
}
