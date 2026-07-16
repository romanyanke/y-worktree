import { Box, Text, useInput } from 'ink';

interface Props {
  onClose: () => void;
}

const COMMANDS: [string, string][] = [
  ['↑/↓, k/j', 'Move the cursor'],
  ['space', 'Mark/unmark worktree for bulk operations (main cannot be marked)'],
  ['d', 'Delete marked worktrees, or the one under the cursor. Dirty ones ask for an extra force confirmation'],
  ['m', 'Adopt: check out the branch in the main repo. Keep the worktree (detached HEAD, files intact) or delete it'],
  ['l', 'Set a human-readable label for the worktree. Empty input removes the label'],
  ['n', 'Create a new worktree from an existing or new branch'],
  ['/', 'Filter the list by label, branch or path'],
  ['p', 'Prune stale worktrees and orphaned labels (git worktree prune)'],
  ['r', 'Refresh the list'],
  ['?', 'Toggle this help'],
  ['q, esc', 'Quit (esc first clears an active filter)'],
];

export function HelpDialog({ onClose }: Props) {
  useInput((input, key) => {
    if (key.escape || key.return || input === 'q' || input === '?') onClose();
  });

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="cyan" paddingX={2}>
      <Text bold color="cyan">
        Help — commands
      </Text>
      {COMMANDS.map(([keys, desc]) => (
        <Box key={keys}>
          <Box width={11} flexShrink={0}>
            <Text color="cyan">{keys}</Text>
          </Box>
          <Text wrap="truncate-end">{desc}</Text>
        </Box>
      ))}
      <Text dimColor>esc / q / ? close</Text>
    </Box>
  );
}
