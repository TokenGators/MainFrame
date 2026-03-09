# Agent Rules

Rules for all AI agents (Claude, OpenClaw, or any other system) working in this repo.

## Before starting work
1. Check `projects/[name]/WORKSPACE.md` — if Status is ACTIVE, notify the human initiator before proceeding
2. Create a branch: `agent/[project-name]/[short-task-description]`
3. Set `WORKSPACE.md` Status to ACTIVE, fill in all fields

## While working
4. Only modify files inside your project's folder (`projects/[name]/`)
5. Do not modify template files unless the task is explicitly a template update
6. Commit frequently with proper message format (see below)

## When done
7. Set `WORKSPACE.md` Status back to IDLE
8. Open a PR targeting `dev` (not `main`)
9. Fill in the PR template completely — do not skip fields

## Commit message format
```
[type][project-name] short description

type: feat | fix | refactor | docs | chore | import

Agent: Claude (claude.ai) | OpenClaw (local)
Initiated by: [human username]
```

## You may never
- Push directly to `main` or `dev`
- Merge your own PR
- Modify `.github/` files without explicit human instruction
- Delete branches you did not create
