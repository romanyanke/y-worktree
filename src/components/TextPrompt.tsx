import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useState } from 'react';

interface Props {
  title: string;
  hint?: string;
  initialValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function TextPrompt({ title, hint, initialValue = '', onSubmit, onCancel }: Props) {
  const [value, setValue] = useState(initialValue);

  useInput((_input, key) => {
    if (key.escape) onCancel();
  });

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="cyan" paddingX={2}>
      <Text bold color="cyan">
        {title}
      </Text>
      <Box>
        <Text color="cyan">› </Text>
        <TextInput value={value} onChange={setValue} onSubmit={onSubmit} />
      </Box>
      <Text dimColor>{hint ?? 'enter confirm · esc cancel'}</Text>
    </Box>
  );
}
