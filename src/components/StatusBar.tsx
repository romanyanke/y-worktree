import { Box, Text } from 'ink';

interface Props {
  message?: string | null;
  messageColor?: string;
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

export function StatusBar({ message, messageColor }: Props) {
  return (
    <Box borderStyle="single" paddingX={1} flexDirection="column">
      {message ? (
        <Text color={messageColor ?? 'yellow'} wrap="truncate">
          {message}
        </Text>
      ) : (
        <Text dimColor wrap="truncate">
          {HINTS.map(([key, desc], i) => (
            <Text key={key}>
              {i > 0 ? '  ' : ''}
              <Text color="cyan">{key}</Text> {desc}
            </Text>
          ))}
        </Text>
      )}
    </Box>
  );
}
