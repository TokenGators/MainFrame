# Studio Monorepo

Single source of truth for all projects — websites, web apps, browser games, and mobile games.

## Quick links
- [Start a new project](docs/TEMPLATES.md)
- [Import an existing project](docs/IMPORT.md)
- [Agent rules](docs/AGENTS.md)
- [Contributing (humans)](docs/CONTRIBUTING.md)

## Structure
```
projects/   ← All active projects, one folder each
templates/  ← Start every new project from one of these
docs/       ← Workflow docs for humans and agents
.github/    ← PR templates, CI workflows
```

## Branch conventions
- `main` — stable, deployable, human-merge only
- `dev` — integration branch, target for all PRs
- `agent/[project]/[task]` — AI agent work branches
- `human/[project]/[task]` — human work branches
- `import/[project]` — one-time import branches
test
