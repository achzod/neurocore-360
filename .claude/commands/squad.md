# Launch Claude Squad

Start the multi-agent manager for parallel development.

## Usage

Run in terminal:
```bash
claude-squad
```

This opens an interactive TUI where you can:
- Create new agent instances with `n`
- Switch between agents with arrow keys
- View agent output in real-time
- Kill agents with `d`

## Specialized Agents

Create agents with specific roles by loading their CLAUDE.md:

1. **Backend Agent**: Focus on `/server/`, API, database
2. **Frontend Agent**: Focus on `/client/`, UI, styling
3. **QA Agent**: Focus on tests, linting, type checking

## Git Worktree Setup (Recommended)

For isolated development:
```bash
# Create worktrees for each agent
git worktree add ../neurocore-backend backend-dev
git worktree add ../neurocore-frontend frontend-dev
git worktree add ../neurocore-qa qa-dev
```

Then run claude-squad in each worktree directory.
