# User Guide — TokenGators AI System

> **Location:** `docs/USER_GUIDE.md`
> **Related docs:** [AGENTS.md](AGENTS.md) · [SERVER-SETUP.md](SERVER-SETUP.md) · [CONTRIBUTING.md](CONTRIBUTING.md)
> **Last updated:** 2026-03-10

---

## What Is This System?

TokenGators runs a collaborative AI-powered development environment where **humans direct and AI executes**. You don't need to write code. You give instructions; the agents do the work.

The stack:

- **Discord** — Your primary interface for talking to the AI
- **OpenClaw** — The AI agent platform running on the Mac Mini server, connected to Discord
- **Claude** — The AI model powering the agents (via Anthropic API)
- **GitHub** — The source of truth for all code and documentation
- **Ollama** — Local AI models running on-server for lightweight tasks

---

## What the AI Has Access To

Understanding what the agent can see and do helps you give better instructions.

### ✅ What It Can Access

| Resource | Details |
|---|---|
| **Your files** | Full read/write access to the workspace (`~/.openclaw/workspace`) |
| **GitHub** | Can read repos, create branches, commit code, open PRs, comment on issues |
| **Shell / Terminal** | Can run commands on the Mac Mini server |
| **Discord** | Reads messages in channels it's configured for; sends replies |
| **Web / APIs** | Can make HTTP requests, check weather, query external APIs |
| **Ollama (local models)** | Can route tasks to local AI models running on the server |
| **Cron / Scheduling** | Can set reminders and scheduled tasks for itself |

### ❌ What It Cannot Do Without Being Asked

| Action | Notes |
|---|---|
| **Push to `main`** | Agents open PRs; humans merge |
| **Send external messages** | Won't email, DM, or post publicly without explicit instruction |
| **Delete things irreversibly** | Prefers `trash` over `rm`; will ask before destructive actions |
| **Share your private data** | In group chats, it does not expose your personal files or messages |

---

## How Memory Works (Important!)

**The AI wakes up fresh every session.** It has no built-in memory between conversations.

Its memory lives in files:

| File | Purpose |
|---|---|
| `MEMORY.md` | Long-term curated memory — decisions, context, key facts |
| `memory/YYYY-MM-DD.md` | Daily notes — raw logs of what happened |

### What This Means For You

- If you finish a setup or make a decision, **tell the agent to write it down**
- Say things like: *"Note that for next time"* or *"Add this to memory"*
- If you're continuing work from a previous session, paste the relevant context or say *"Check memory for X"*
- Thread history in Discord is injected as context, but only for the current thread — it doesn't cross sessions or channels automatically

### Session Types

| Context | Memory Behavior |
|---|---|
| **Direct / Main session** | Full memory access (MEMORY.md + daily notes) |
| **Discord channel / group chat** | Thread context only — MEMORY.md intentionally NOT loaded (privacy) |
| **Sub-agents** | Isolated sessions — no memory unless explicitly passed in |

---

## How to Talk to the AI

### In Discord

Just type in the configured channel or thread. The agent reads every message but tries to only respond when it's useful — not just to chime in on every conversation.

**Be direct.** The agent prefers action over clarification. Give it enough context to proceed:

> ✅ *"Create a new project called 'tower-defense' using the Phaser template, set up the folder structure, and open a PR"*
> ❌ *"Can you maybe help with a new game?"*

### Commanding the Agent

No special syntax required — plain English works. A few helpful patterns:

| What You Want | How to Say It |
|---|---|
| Start a coding task | *"Build X in the [game] project"* |
| Check on work | *"What's the status of [task]?"* |
| Remember something | *"Note this for next time: [info]"* |
| Set a reminder | *"Remind me in 2 hours to review the PR"* |
| Check GitHub | *"List open PRs"* or *"Any issues tagged bug?"* |
| Deploy/run a task | *"Run the gh-issues check on MainFrame"* |

---

## The GitHub Workflow

Humans don't write or merge code — that's the whole point. Here's how it flows:

```
You give instruction (Discord)
        ↓
Agent creates a branch: agent/[project]/[task]
        ↓
Agent does the work, commits with proper format
        ↓
Agent opens a PR targeting `dev`
        ↓
You review and merge (or ask the agent to revise)
        ↓
Leads merge `dev` → `main` when ready
```

### Branch Naming

| Who | Branch Format |
|---|---|
| OpenClaw agents | `agent/[project-name]/[short-task]` |
| Human direct work | `human/[project-name]/[short-task]` |

### Commit Format

```
[type][project-name] short description

type: feat | fix | refactor | docs | chore | import
Agent: OpenClaw (local)
Initiated by: [your Discord username]
```

---

## Project Structure

Each game/app lives in `/projects/[name]/` and is self-contained:

```
projects/
└── [game-name]/
    ├── WORKSPACE.md     ← Active work status (IDLE / ACTIVE)
    ├── PROJECT.md       ← Stack, decisions, rules for this project
    ├── package.json     ← Project-level dependencies
    └── src/             ← All source code
```

**WORKSPACE.md** is how agents coordinate — if it says `ACTIVE`, another agent is working. The agent will flag this before starting new work on the same project.

---

## Setting Up GitHub (New Server)

For headless servers (no browser), use a Personal Access Token (PAT):

1. Go to github.com/settings/tokens → **Generate new token (classic)**
2. Required scopes: `repo`, `read:org`, `workflow`, `gist`, `project`
3. On the server, run:
   ```bash
   gh auth login
   # Choose: GitHub.com → HTTPS → Paste an authentication token
   # Paste your PAT when prompted
   ```
4. Verify: `gh auth status`
5. Set git identity:
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your@email.com"
   ```

**Token scopes cheatsheet:**

| Scope | Why |
|---|---|
| `repo` | Read/write repos, branches, PRs |
| `read:org` | See org-level repos and teams |
| `workflow` | Trigger and view GitHub Actions |
| `gist` | Gist access (optional but useful) |
| `project` | GitHub Projects board access |

---

## Skills — What the Agent Knows How To Do

OpenClaw has pre-built "skills" that extend what the agent can do:

| Skill | What It Does |
|---|---|
| **gh-issues** | Fetches GitHub issues, spawns agents to fix them, opens PRs, monitors reviews |
| **github** | General GitHub ops — PRs, CI, issues, code review via `gh` CLI |
| **coding-agent** | Delegates complex coding tasks to Codex, Claude Code, or Pi agents |
| **weather** | Current weather and forecasts |
| **tmux** | Remote-controls terminal sessions |
| **session-logs** | Searches past conversation logs |
| **healthcheck** | Security audits and server hardening checks |

Skills are invoked automatically when the agent recognizes the task — you don't need to call them by name.

---

## Sub-Agents & Parallel Work

For big tasks, the agent can spawn **sub-agents** — isolated AI sessions that work in parallel:

- Sub-agents inherit the workspace and tools
- They complete their task and report back
- You can ask: *"What are the sub-agents working on?"* or *"Stop the sub-agent working on X"*

This is how the system handles complex multi-step tasks without blocking you.

---

## Tips & Common Gotchas

- **Start every new task with a clear goal** — the more specific, the less back-and-forth
- **If the agent seems lost, give it a file to read** — e.g., *"Read WORKSPACE.md for tower-defense first"*
- **Memory doesn't persist automatically** — say *"Remember this"* if it matters
- **PRs go to `dev`, not `main`** — always. The agent knows this, but worth knowing yourself
- **The agent won't merge PRs** — that's your job (or a lead's)
- **For urgent stuff, mention the agent directly** in Discord — it's smarter about when to respond in busy channels

---

## Quick Reference Card

```
Start a project  → "Build [feature] in [project] and open a PR"
Check status     → "What's the status of [project]?"
GitHub ops       → "List open PRs" / "Check CI on [branch]"
Memory           → "Remember: [thing]" / "Check memory for [topic]"
Reminder         → "Remind me in [time] to [thing]"
Sub-agents       → "What are the agents working on?"
New project      → "Create project [name] using [template] template"
```

---

*This guide is a living document. As the system evolves, update it — or tell the agent to.*
