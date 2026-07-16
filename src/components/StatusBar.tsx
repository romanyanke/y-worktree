import { Box, Text } from 'ink';

interface Props {
  message?: string | null;
  messageColor?: string;
  selectedCount?: number;
}

const HINTS: [string, string][] = [
  ['↑↓', 'move'],
  ['space', 'select'],
  ['d', 'delete'],
  ['m', 'adopt'],
  ['l', 'label'],
  ['n', 'new'],
  ['/', 'filter'],
  ['p', 'prune'],
  ['r', 'refresh'],
  ['q', 'quit'],
];

export function StatusBar({ message, messageColor, selectedCount = 0 }: Props) {
  return (
    <Box borderStyle="single" paddingX={1} flexDirection="column" flexShrink={0}>
      {message && (
        <Text color={messageColor ?? 'yellow'} wrap="truncate">
          {message}
        </Text>
      )}
      <Text dimColor wrap="truncate">
        {HINTS.map(([key, desc], i) => (
          <Text key={key}>
            {i > 0 ? '  ' : ''}
            <Text color="cyan">{key}</Text> {desc}
          </Text>
        ))}
        {selectedCount > 0 && <Text color="magenta">  ·  {selectedCount} selected</Text>}
      </Text>
    </Box>
  );
}
