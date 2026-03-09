# Developer Workflow — TokenGators MainFrame Monorepo

This guide explains how to work on projects in the MainFrame monorepo. **All developers must follow this.**

---

## Quick Reference

**Repository:** `TokenGators/MainFrame`
**Your projects:** Located in `/projects/[project-name]/`

**Branching:**
```
main (protected — production ready)
 ↓
dev (integration branch — where PRs merge)
 ↓
agent/[project]/[task] ← Feature branches for your work
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/TokenGators/MainFrame.git
cd MainFrame
```

### 2. Set Up Git Config

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

---

## Workflow: Starting a Feature

### Step 1: Update to Latest

```bash
git checkout dev
git pull origin dev
```

### Step 2: Create Your Feature Branch

```bash
git checkout -b agent/[project-name]/[task-description]
```

**Branch naming examples:**
- `agent/space-n-gators/add-wave-spawner`
- `agent/gatorrr/fix-turtle-collision`
- `agent/space-n-gators/refactor-physics`

### Step 3: Update WORKSPACE.md

In `/projects/[project]/WORKSPACE.md`, set:

```markdown
**Status:** ACTIVE
**Last updated:** [DATE]
**Working on:** [Brief description of your task]
**Branch:** agent/[project]/[task]
**Initiated by:** [Your name]
```

Commit this update:
```bash
git add projects/[project]/WORKSPACE.md
git commit -m "chore[project]: workspace set to ACTIVE"
```

---

## Making Changes

### Commit Message Format

**Format:**
```
[type][project] short description
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code reorganization (no behavior change)
- `docs` — Documentation only
- `chore` — Build, config, dependency updates

**Examples:**
```
feat[space-n-gators]: add enemy wave spawner with difficulty scaling
fix[gatorrr]: resolve platform collision detection edge case
refactor[space-n-gators]: extract physics engine to separate module
docs[gatorrr]: add level design guide to LOG_LAYOUT_SPEC.md
chore[space-n-gators]: update Phaser to 3.56.0
```

### Committing Your Work

```bash
# Stage files
git add src/ public/

# Commit with proper message
git commit -m "feat[space-n-gators]: implement wave spawner"

# Make more changes and commits as needed
git add src/
git commit -m "fix[space-n-gators]: fix spawner timing bug"
```

---

## Before Pushing — Final Checks

- ✅ Code is tested locally
- ✅ No console errors
- ✅ Game runs/builds without issues
- ✅ All commits follow message format
- ✅ WORKSPACE.md is updated

---

## Opening a Pull Request

### Step 1: Push Your Branch

```bash
git push origin agent/[project]/[task]
```

### Step 2: Create the PR

**Via Command Line:**
```bash
gh pr create --base dev --head agent/[project]/[task] \
  --title "feat[project]: your description" \
  --body "Description of changes..."
```

**Via GitHub Web:**
1. Go to https://github.com/TokenGators/MainFrame
2. Click "Pull Requests" → "New Pull Request"
3. Set:
   - **Base:** `dev`
   - **Compare:** `agent/[project]/[task]`
4. Fill in title and description

### Step 3: Use the PR Template

```markdown
## What this does
[One sentence summary]

## Project
`/projects/[project-name]`

## Type of change
- [x] New feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Docs

## Testing done
- [x] Tested locally
- [x] No console errors
- [x] Gameplay verified

## WORKSPACE.md updated?
- [x] Set to IDLE after this PR
```

### Step 4: Update WORKSPACE.md to IDLE

Once your PR is open, update `/projects/[project]/WORKSPACE.md`:

```markdown
**Status:** IDLE
**Working on:** —
**Branch:** —
```

Commit and push:
```bash
git add projects/[project]/WORKSPACE.md
git commit -m "chore[project]: set workspace to IDLE"
git push origin agent/[project]/[task]
```

---

## After Your PR

1. **Wait for review** — A team member will review your code
2. **Respond to feedback** — Make changes if requested
3. **Reviewer merges** — Once approved, reviewer merges to `dev`
4. **Delete your branch** — GitHub will offer to delete after merge

---

## Complete Workflow Example

Let's say you're adding audio to Space-N-Gators:

```bash
# 1. Get latest
git checkout dev
git pull origin dev

# 2. Create feature branch
git checkout -b agent/space-n-gators/add-audio

# 3. Update WORKSPACE.md
# Edit projects/space-n-gators/WORKSPACE.md
# Set Status: ACTIVE, Working on: "Add game audio"
git add projects/space-n-gators/WORKSPACE.md
git commit -m "chore[space-n-gators]: workspace set to ACTIVE"

# 4. Work on audio
# ... edit src/main.js, add audio files, test locally ...

# 5. Commit changes
git add src/
git commit -m "feat[space-n-gators]: add wave start and wave complete audio"

git add public/
git commit -m "feat[space-n-gators]: add audio asset files"

# 6. Push to GitHub
git push origin agent/space-n-gators/add-audio

# 7. Create PR
gh pr create --base dev --head agent/space-n-gators/add-audio \
  --title "feat[space-n-gators]: add game audio effects" \
  --body "Adds wave start and wave complete sound effects to improve game feedback."

# 8. Set WORKSPACE.md to IDLE
# Edit projects/space-n-gators/WORKSPACE.md
# Set Status: IDLE
git add projects/space-n-gators/WORKSPACE.md
git commit -m "chore[space-n-gators]: set workspace to IDLE"
git push origin agent/space-n-gators/add-audio

# 9. Wait for review and merge
# (Reviewer will merge to dev)
```

---

## Project File Reference

Every project has these files:

```
/projects/[project]/
├── WORKSPACE.md      ← Update this at start/end of work
├── PROJECT.md        ← Stack, status, decisions (reference)
├── package.json      ← Dependencies
├── src/ or main.js   ← Game code
├── public/           ← Assets (images, audio, etc.)
├── webpack.config.js ← Build config
└── README.md         ← Project-specific docs
```

---

## Important Rules

### ✅ DO:

- Always work on a feature branch (`agent/[project]/[task]`)
- Follow commit message format exactly
- Test locally before pushing
- Update WORKSPACE.md when you start/finish
- Keep commits focused (one feature per commit)
- Write clear PR descriptions
- Keep code within your project folder

### ❌ DON'T:

- Push directly to `dev` or `main`
- Commit to `main` (always use PR)
- Modify files outside your project folder
- Forget to update WORKSPACE.md
- Leave WORKSPACE.md as ACTIVE when done
- Modify template files unless explicitly asked
- Mix multiple features in one PR

---

## Troubleshooting

### "I committed to `dev` by accident"

```bash
# Create a feature branch from your current work
git branch agent/[project]/[task]

# Reset dev to match GitHub
git checkout dev
git reset --hard origin/dev

# Go back to your work
git checkout agent/[project]/[task]

# Push and create PR normally
```

### "How do I pull latest changes while working?"

```bash
# Commit your work
git add .
git commit -m "feat[project]: work in progress"

# Fetch and merge latest
git fetch origin
git merge origin/dev

# Resolve conflicts if any, then continue
```

### "I need to undo a commit"

```bash
# Keep the changes, undo the commit
git reset --soft HEAD~1

# Or discard the commit entirely
git reset --hard HEAD~1
```

### "My branch is behind dev"

```bash
# Rebase on latest dev
git fetch origin
git rebase origin/dev

# Or merge dev into your branch
git merge origin/dev
```

---

## Questions?

- **Process questions:** Ask Kthings
- **Code help:** Ask your team
- **Git issues:** Check this guide or ask for help

---

## Summary

1. Create feature branch: `agent/[project]/[task]`
2. Update WORKSPACE.md to ACTIVE
3. Make commits with proper messages
4. Push to GitHub
5. Open PR to `dev`
6. Update WORKSPACE.md to IDLE
7. Wait for review and merge
8. Done! 🎮

