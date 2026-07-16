import { Box, Text } from 'ink';
import type { Worktree } from '../types.js';

interface Props {
  worktrees: Worktree[];
  cursor: number;
  selected: Set<string>;
  repoName: string;
  filter: string;
  width: number;
}

function statusIndicator(wt: Worktree): { text: string; color: string } {
  if (wt.isPrunable) return { text: 'prunable', color: 'red' };
  if (wt.isLocked) return { text: 'locked', color: 'yellow' };
  if (!wt.status) return { text: '…', color: 'gray' };
  const parts: string[] = [];
  const changed = wt.status.staged + wt.status.modified + wt.status.untracked;
  if (changed > 0) parts.push(`●${changed}`);
  if (wt.status.ahead > 0) parts.push(`↑${wt.status.ahead}`);
  if (wt.status.behind > 0) parts.push(`↓${wt.status.behind}`);
  if (parts.length === 0) return { text: 'clean', color: 'green' };
  return { text: parts.join(' '), color: changed > 0 ? 'yellow' : 'cyan' };
}

export function WorktreeList({ worktrees, cursor, selected, repoName, filter, width }: Props) {
  const title = filter ? `Worktrees (${repoName}) — filter: ${filter}` : `Worktrees (${repoName})`;
  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1} width={width} flexShrink={0}>
      <Text bold color="cyan">
        {title}
      </Text>
      {worktrees.length === 0 && (
        <Text dimColor>{filter ? 'No worktrees match the filter' : 'No worktrees'}</Text>
      )}
      {worktrees.map((wt, i) => {
        const isCursor = i === cursor;
        const isSelected = selected.has(wt.path);
        const marker = isCursor ? '▸' : ' ';
        const check = wt.isMain ? '·' : isSelected ? '●' : '○';
        const name = wt.label ?? wt.branch ?? wt.head.slice(0, 7);
        const branch = wt.branch ?? `detached@${wt.head.slice(0, 7)}`;
        const ind = statusIndicator(wt);
        // border+padding = 4, marker+check+gaps = 7, rest split between columns
        const contentWidth = Math.max(26, width - 11);
        const nameWidth = Math.floor(contentWidth * 0.45);
        const branchWidth = Math.floor(contentWidth * 0.3);
        return (
          <Box key={wt.path} gap={1}>
            <Text color={isCursor ? 'cyan' : undefined}>{marker}</Text>
            <Text color={isSelected ? 'magenta' : 'gray'}>{check}</Text>
            <Box width={nameWidth} flexShrink={0}>
              <Text bold={!!wt.label || wt.isMain} color={isCursor ? 'cyan' : wt.label ? 'white' : undefined} wrap="truncate">
                {name}
                {wt.isMain ? ' (main)' : ''}
              </Text>
            </Box>
            <Box width={branchWidth} flexShrink={0}>
              <Text dimColor wrap="truncate">
                {branch}
              </Text>
            </Box>
            <Box flexShrink={0}>
              <Text color={ind.color}>{ind.text}</Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
