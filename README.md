# ywt

Interactive terminal UI for managing git worktrees — list them, see their status at a glance, label agent-created worktrees with human-readable names, adopt branches back into the main repo, and delete worktrees in bulk.

```
┌ Worktrees (repo) ───────────────────┬ Details ───────────────────────┐
│ ▸ · main (main)   main       clean  │ Path     ~/localhost/repo      │
│   ○ Auth fix      feat/x1    ●3 ↑2  │ Label    Auth fix              │
│   ● Login bug     agent-8f2  clean  │ Branch   feat/x1               │
│                                     │ HEAD     a1b2c3d fix: … (2h)   │
│                                     │ Changes  3 modified            │
├─────────────────────────────────────┴────────────────────────────────┤
│ ↑↓ move  space select  d delete  m adopt  l label  n new  / filter  │
└──────────────────────────────────────────────────────────────────────┘
```

## Install

```sh
npm install
npm run build
npm link        # global `ywt` command
```

Or build a standalone binary (no Node required on the target machine, needs [Bun](https://bun.sh) to build):

```sh
npm run build:bin   # produces ./ywt executable
```

## Usage

Run `ywt` inside any git repository (main checkout or a worktree).

| Key | Action |
| --- | --- |
| `↑`/`↓`/`j`/`k` | Move cursor |
| `space` | Mark/unmark worktree for bulk operations |
| `d` | Delete marked worktrees (or the one under cursor). Dirty worktrees require an extra force confirmation |
| `m` | **Adopt**: check out the worktree's branch in the main repo. Choose to keep the worktree (it stays on a detached HEAD with all files intact — useful when AI agents keep working there) or delete it |
| `l` | Set a human-readable label for the worktree (agents create worktrees with dynamic names — label them without renaming). Empty input removes the label |
| `/` | Filter by label, branch or path |
| `o` | Open a new terminal window in the worktree folder |
| `n` | Create a new worktree (existing or new branch) |
| `?` | Toggle the help overlay |
| `p` | `git worktree prune` + clean up orphaned labels |
| `r` | Refresh |
| `q` / `esc` | Quit (esc first clears an active filter) |

Labels are stored in `<git-common-dir>/ywt-labels.json` — local to the repo, never committed.

## Development

```sh
npm run dev        # run from source (tsx)
npm test           # vitest parser tests
npm run typecheck
```
