import { Box, Text, useInput } from 'ink';
import { useState } from 'react';

export interface DialogOption {
  key: string;
  label: string;
  color?: string;
}

interface Props {
  title: string;
  lines?: string[];
  options: DialogOption[];
  onSelect: (key: string) => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, lines = [], options, onSelect, onCancel }: Props) {
  const [cursor, setCursor] = useState(0);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      onSelect(options[cursor]!.key);
      return;
    }
    const hit = options.find((o) => o.key === input);
    if (hit) {
      onSelect(hit.key);
    } else if (key.upArrow) {
      setCursor((c) => (c + options.length - 1) % options.length);
    } else if (key.downArrow) {
      setCursor((c) => (c + 1) % options.length);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="yellow" paddingX={2} paddingY={0}>
      <Text bold color="yellow">
        {title}
      </Text>
      {lines.map((line, i) => (
        <Text key={i} dimColor wrap="truncate">
          {line}
        </Text>
      ))}
      <Box flexDirection="column" marginTop={1}>
        {options.map((opt, i) => (
          <Text key={opt.key} color={i === cursor ? (opt.color ?? 'cyan') : undefined} inverse={i === cursor}>
            [{opt.key}] {opt.label}
          </Text>
        ))}
      </Box>
      <Text dimColor>esc cancel</Text>
    </Box>
  );
}
