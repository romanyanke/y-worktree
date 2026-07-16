import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';
import { getLastCommit } from '../git.js';
import type { LastCommit, Worktree } from '../types.js';

interface Props {
  worktree: Worktree | undefined;
}

function Row({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <Box>
      <Box width={9}>
        <Text dimColor>{name}</Text>
      </Box>
      {children}
    </Box>
  );
}

export function DetailsPane({ worktree }: Props) {
  const [commit, setCommit] = useState<LastCommit | null>(null);

  useEffect(() => {
    setCommit(null);
    if (!worktree) return;
    let cancelled = false;
    void getLastCommit(worktree.path).then((c) => {
      if (!cancelled) setCommit(c);
    });
    return () => {
      cancelled = true;
    };
  }, [worktree?.path, worktree?.head]);

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1} flexGrow={1} flexBasis={0}>
      <Text bold color="cyan">
        Details
      </Text>
      {!worktree ? (
        <Text dimColor>Nothing selected</Text>
      ) : (
        <>
          <Row name="Path">
            <Text wrap="truncate-middle">{worktree.path}</Text>
          </Row>
          {worktree.label && (
            <Row name="Label">
              <Text bold color="white">
                {worktree.label}
              </Text>
            </Row>
          )}
          <Row name="Branch">
            <Text color="green">{worktree.branch ?? `(detached @ ${worktree.head.slice(0, 7)})`}</Text>
          </Row>
          <Row name="HEAD">
            {commit ? (
              <Text>
                <Text color="yellow">{commit.hash}</Text> {commit.subject}{' '}
                <Text dimColor>({commit.relativeDate})</Text>
              </Text>
            ) : (
              <Text dimColor>…</Text>
            )}
          </Row>
          <Row name="Changes">
            {!worktree.status ? (
              <Text dimColor>loading…</Text>
            ) : !worktree.status.dirty ? (
              <Text color="green">clean</Text>
            ) : (
              <Text color="yellow">
                {[
                  worktree.status.staged && `${worktree.status.staged} staged`,
                  worktree.status.modified && `${worktree.status.modified} modified`,
                  worktree.status.untracked && `${worktree.status.untracked} untracked`,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            )}
          </Row>
          {worktree.status && (worktree.status.ahead > 0 || worktree.status.behind > 0) && (
            <Row name="Remote">
              <Text color="cyan">
                ahead {worktree.status.ahead} / behind {worktree.status.behind}
              </Text>
            </Row>
          )}
          {worktree.isLocked && (
            <Row name="State">
              <Text color="yellow">locked</Text>
            </Row>
          )}
          {worktree.isPrunable && (
            <Row name="State">
              <Text color="red">prunable</Text>
            </Row>
          )}
        </>
      )}
    </Box>
  );
}
