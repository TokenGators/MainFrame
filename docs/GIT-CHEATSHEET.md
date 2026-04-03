# Git Cheat Sheet — MainFrame Workflow

## The Short Version

You **never need to touch GitHub directly** for day-to-day work. VS Code + the workflow script handle everything. GitHub is just where the code lives — you only go there to review PRs or check CI status.

---

## The Workflow (Every Time)

### 1. Start a new task
```bash
cd /Users/operator/repos/MainFrame
./scripts/git-workflow.sh start <project> <task-name>
```
Example: `./scripts/git-workflow.sh start media-assets restore-database`

This creates a branch: `agent/media-assets/restore-database`

### 2. Save your work (commit)
```bash
./scripts/git-workflow.sh save <type> <project> "what you did"
```
Types: `feat`, `fix`, `docs`, `chore`, `refactor`

Example: `./scripts/git-workflow.sh save feat media-assets "restore posts and assets jsonl from git history"`

**Do this often** — think of it like saving a document. Every meaningful chunk of work = one save.

### 3. Submit for review (open a PR)
```bash
./scripts/git-workflow.sh submit <project> <task-name> "PR title"
```
Example: `./scripts/git-workflow.sh submit media-assets restore-database "Restore deleted database files"`

This pushes your branch and opens a pull request on GitHub automatically.

### 4. Check status anytime
```bash
./scripts/git-workflow.sh status
```

### 5. Finish (after PR is merged)
```bash
./scripts/git-workflow.sh finish <project>
```

---

## VS Code Tips

- **Source Control panel** (left sidebar, branch icon) shows uncommitted changes
- You can see what branch you're on in the **bottom-left corner** of VS Code
- The workflow script handles all the branch/push/PR logic — you don't need to use the VS Code Git UI for that
- Use VS Code's terminal (`Ctrl+`` ` ``) to run the workflow script commands

---

## Common Situations

### "I made changes, how do I save them?"
```bash
./scripts/git-workflow.sh save feat <project> "describe what changed"
```

### "I want to see what branch I'm on"
```bash
git branch
# or
git status
```

### "I want to see recent commits"
```bash
git log --oneline -10
```

### "I accidentally deleted something — how do I recover it?"
```bash
# Find the commit where the file existed
git log --all --oneline -- path/to/file.txt

# Restore it from that commit
git show <hash>:path/to/file.txt > path/to/file.txt
```

### "Where do I find my PR on GitHub?"
Go to: `https://github.com/[org]/MainFrame/pulls`
Or run: `gh pr list`

### "Do I need to do anything on GitHub directly?"
Only to:
- Review and merge PRs (click the green Merge button)
- Check CI test results
- Leave review comments

Everything else happens locally via the workflow script.

---

## Branch Naming

Branches follow this pattern: `agent/<project>/<task>`

- `agent/media-assets/restore-database`
- `agent/brand-story/add-content-classifier`
- `agent/gatorrr/fix-collision-bug`

---

## Commit Types

| Type | When to use |
|------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Maintenance, cleanup, restores |
| `refactor` | Code restructure, no behavior change |

---

## The Golden Rule

**Commit early, commit often.** A commit is just a save point — you can always undo or go back. The only mistake is not committing and losing work.

---

## Quick Reference Card

```
START:   ./scripts/git-workflow.sh start <project> <task>
SAVE:    ./scripts/git-workflow.sh save <type> <project> "message"
SUBMIT:  ./scripts/git-workflow.sh submit <project> <task> "PR title"
STATUS:  ./scripts/git-workflow.sh status
FINISH:  ./scripts/git-workflow.sh finish <project>
```
