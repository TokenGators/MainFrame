# Mac Mini M4 Max — OpenClaw + Claude Collaborative Game Dev Server

> **Location:** `docs/SERVER-SETUP.md`
> **Related docs:** [AGENTS.md](AGENTS.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [TEMPLATES.md](TEMPLATES.md) · [IMPORT.md](IMPORT.md)
> **Last updated:** 2026-03-10

---

> **Hardware:** Mac Mini M4 Max (64GB+ Unified Memory)
> **Purpose:** Dedicated server for collaborative game/app development using OpenClaw agents (Discord-based) and Claude (web UI / Claude Code), following the team's GitHub Monorepo Architecture & Workflow standards
> **Team:** Non-coding founders directing AI agents to build games and apps
> **Key constraint:** Humans don't write or merge code — automation handles git workflow

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│ Your Team (Non-Coders) │
│ │
│ ┌──────────────────┐ ┌──────────────────────┐ │
│ │ Discord │ │ Claude.ai (Web UI) │ │
│ │ "Write the player │ │ "Review this arch, │ │
│ │ movement system" │ │ check the code, │ │
│ │ │ │ improve the docs" │ │
│ └────────┬──────────┘ └──────────┬───────────┘ │
└───────────┼──────────────────────────────┼───────────┘
 │ │
┌───────────▼──────────────────────────────▼───────────┐
│ Mac Mini Server │
│ │
│ ┌──────────────────┐ ┌───────────────────────┐ │
│ │ OpenClaw Gateway │ │ Claude Code CLI │ │
│ │ (Node.js service) │ │ │ │
│ │ │ │ Reviews architecture, │ │
│ │ Multi-agent with │ │ audits code quality, │ │
│ │ Discord routing, │ │ writes docs, suggests │ │
│ │ shell access, │ │ improvements │ │
│ │ GitHub skills │ │ │ │
│ └────────┬──────────┘ └──────────┬────────────┘ │
│ │ │ │
│ ┌────────▼────────────────────────────▼────────────┐ │
│ │ GitHub Monorepo (Source of Truth) │ │
│ │ │ │
│ │ /projects/[game-name]/ ← Self-contained project │ │
│ │ ├── WORKSPACE.md ← Active work status │ │
│ │ ├── PROJECT.md ← Stack, decisions, rules │ │
│ │ ├── package.json ← Project-level deps │ │
│ │ └── src/ │ │
│ │ │ │
│ │ main ◄── Protected, human-merge only │ │
│ │ └── dev ◄── Integration, agents target this │ │
│ │ ├── agent/[project]/[task] ◄── OpenClaw │ │
│ │ └── human/[project]/[task] ◄── Direct work │ │
│ │ │ │
│ │ /templates/ ← Starter kits for new projects │ │
│ │ /docs/ ← AGENTS.md, CONTRIBUTING.md, etc. │ │
│ └────────────────────────────────────────────────────┘ │
│ │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Ollama (Local Model Server) │ │
│ │ qwen3-coder:30b · deepcoder:14b · deepseek-r1 │ │
│ └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Core principles from your monorepo standards:**
- Templates are the standardization layer — not the engine or framework choice
- Agents never push to `main` — all work goes through PRs
- Every project is self-contained — no shared root installs, minimal cross-project deps
- Humans initiate, agents execute, humans merge — clear handoff points

---

## Phase 1 — macOS Server Configuration

### 1.1 First Boot & System Settings

```bash
# Set computer name
sudo scutil --set ComputerName "openclaw-server"
sudo scutil --set HostName "openclaw-server"
sudo scutil --set LocalHostName "openclaw-server"

# Prevent sleep (dedicated server)
sudo pmset -a sleep 0
sudo pmset -a disablesleep 1
sudo pmset -a displaysleep 0

# Enable SSH for remote access
sudo systemsetup -setremotelogin on

# Enable Screen Sharing (for when you need GUI access)
# System Settings → General → Sharing → Screen Sharing → On
```

### 1.2 Headless Operation Tips

Since this will run without a monitor:

- **Get an HDMI dummy plug (~$10).** Without it, macOS defaults to a low resolution for screen sharing and some permissions (like Screen Recording) can break. The dummy plug tricks macOS into rendering properly.
- **Enable "Wake for network access"** in System Settings → Battery → Options. This keeps SSH and OpenClaw reachable during low-power mode.
- **Enable automatic login** in System Settings → Users & Groups → Login Options. The server should boot straight to your user account.

### 1.3 Disable Unnecessary Services

```bash
sudo mdutil -a -i off # Disable Spotlight indexing
defaults write NSGlobalDomain NSAppSleepDisabled -bool YES # Prevent App Nap
```

### 1.4 Security Baseline

OpenClaw has shell access and can execute commands autonomously. Secure the machine before installing it:

```bash
# Verify FileVault (full-disk encryption) is on
sudo fdesetup status
# If not: System Settings → Privacy & Security → FileVault → Turn On

# Enable the macOS firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
```

Consider creating a **separate standard (non-admin) user** for running OpenClaw. This limits the blast radius if an agent gets tricked by a prompt injection — it can't install system software or modify system files. Use your admin account only for installing tools (Homebrew, npm packages, etc.).

---

## Phase 2 — Developer Toolchain

### 2.1 Core Tools

```bash
# Xcode command line tools
xcode-select --install

# Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# Essential packages
brew install \
 git \
 python@3.12 \
 node@22 \
 gh \
 tmux \
 htop \
 jq \
 wget \
 ripgrep \
 fd
```

**Node.js 22+ is required for OpenClaw.** Use `node@22` explicitly.

### 2.2 Git & GitHub Setup

```bash
git config --global user.name "OpenClaw Server"
git config --global user.email "your-team-email@company.com"

# Authenticate with GitHub
gh auth login

# Clone the monorepo
mkdir -p ~/repos
cd ~/repos
gh repo clone your-org/your-monorepo
cd your-monorepo
```

---

## Phase 3 — Local Model Serving (Ollama)

### 3.1 Install & Configure

```bash
brew install ollama
brew services start ollama # Auto-starts on boot
```

### 3.2 Pull Models

OpenClaw requires models with strong function/tool calling support and at least 64K context. These are the current best options for your 64GB M4 Max:

```bash
# ── Primary coding model (OpenClaw coder agent) ──
# MoE: 30B total, only 3.3B active per token. Fast + smart.
# 256K native context. Alibaba's best agentic code model.
ollama pull qwen3-coder:30b # ~19GB on disk

# ── Code reasoning (alternative coder / hard problems) ──
# Dense 14B, fine-tuned from DeepSeek-R1 via RL.
# Matches o3-mini on code benchmarks.
ollama pull deepcoder:14b # ~9GB on disk

# ── QA / review agent ──
# DeepSeek-R1 distilled to 14B. Strong reasoning.
# Value sweet spot for analysis tasks.
ollama pull deepseek-r1:14b # ~9GB on disk

# ── Fast utility model ──
# DeepSeek-R1 distilled to 8B (0528 update, Qwen3-based).
# Quick tasks, classification, simple Q&A.
ollama pull deepseek-r1:8b # ~5GB on disk

# ── Heavy reasoning (run alone) ──
# For complex architecture sessions.
ollama pull deepseek-r1:32b # ~20GB on disk

# ── General purpose fallback ──
ollama pull llama3.3:70b # ~40GB, run alone
```

### 3.3 Memory Strategy for 64GB

~58GB usable after macOS overhead.

**Everyday game dev (two agents running concurrently):**

| Model | Active Params | RAM (Q4) | Role |
|---|---|---|---|
| qwen3-coder:30b | 3.3B active (MoE) | ~19GB | Coder agent |
| deepseek-r1:14b | 14B dense | ~9GB | QA / review agent |
| **Total** | | **~28GB** | ~30GB headroom |

**Heavy reasoning (one model, complex tasks):**

| Model | RAM (Q4) | Use case |
|---|---|---|
| deepseek-r1:32b | ~20GB | Deep code reasoning |
| llama3.3:70b | ~40GB | General reasoning, run alone |

```bash
# Allow multiple models loaded simultaneously
launchctl setenv OLLAMA_MAX_LOADED_MODELS 3
launchctl setenv OLLAMA_NUM_PARALLEL 4
brew services restart ollama
```

**Why these models over the older recommendations:**

The Qwen3-Coder 30B uses Mixture-of-Experts architecture — it has 30B total parameters but only activates 3.3B per token. This means you get coding quality that rivals models 5–10x larger while using roughly the same RAM as the old deepseek-coder-v2:16b. It also has native 256K context, which is critical for OpenClaw's agentic workflows.

DeepCoder 14B and the DeepSeek-R1 distills replaced the older CodeLlama, Mixtral, and Mistral models. They're better at reasoning, better at tool calling (which OpenClaw depends on), and more capable per parameter.

---

## Phase 4 — Monorepo Setup (Per Your Standards)

Your monorepo doc defines the structure. Here's how it maps to the server.

### 4.1 Repository Structure

```
/
├── .github/
│ ├── PULL_REQUEST_TEMPLATE.md
│ ├── workflows/
│ │ ├── validate-pr.yml
│ │ └── deploy-preview.yml
│ └── CODEOWNERS
├── projects/
│ ├── [game-name]/
│ │ ├── WORKSPACE.md
│ │ ├── PROJECT.md
│ │ ├── package.json
│ │ └── src/
├── templates/
│ ├── template-web-app/
│ ├── template-game-2d/
│ ├── template-game-3d/
│ ├── template-game-rpg/
│ └── template-mobile-rn/
├── docs/
│ ├── AGENTS.md
│ ├── CONTRIBUTING.md
│ ├── TEMPLATES.md
│ └── IMPORT.md
└── README.md
```

### 4.2 Starting a New Game Project

Per your standards, use a template:

```bash
cd ~/repos/your-monorepo
cp -r templates/template-game-2d/ projects/space-shooter/
```

Then fill in the required files (agents should do this automatically):

**projects/space-shooter/PROJECT.md:**
```markdown
# Space Shooter

**Type:** game-2d
**Stack:** Phaser 3 + Vite
**Status:** active
**Deploy:** not deployed
**Deploy trigger:** manual

## Stack decisions & rationale
- 2026-03-09: Chose Phaser 3 for 2D — lightweight, great sprite support

## Known issues / constraints
-

## Agent instructions
- OpenClaw coder agent handles implementation
- Claude reviews architecture and code quality via PRs
- All game systems should be modular (one file per system)
```

**projects/space-shooter/WORKSPACE.md:**
```markdown
# Workspace Status

**Status:** ACTIVE
**Last updated:** 2026-03-09
**Working on:** Initial project setup from template
**Branch:** agent/space-shooter/initial-setup
**Initiated by:** your-username
**Agent system:** OpenClaw

## Recent activity log
- 2026-03-09: Created project from template-game-2d
```

### 4.3 Branch Protection (GitHub Settings)

Per your monorepo doc, configure in GitHub → Settings → Branches:

**`main`:** Require PR + 1 human approval. No direct push. No agent push ever.

**`dev`:** Require PR. Agents may auto-merge after CI passes (per project).

**All other branches:** Open, auto-deletable after merge.

---

## Phase 5 — Git Workflow Script (Monorepo-Aware)

This script enforces your branching conventions, commit format, and WORKSPACE.md management. OpenClaw agents can execute this directly via shell access. Save as `~/repos/your-monorepo/scripts/git-workflow.sh`:

[Script content preserved from your guide - see scripts/git-workflow.sh file]

---

## Phase 6 — OpenClaw Installation & Configuration

OpenClaw is an open-source autonomous AI agent runtime. It runs as a Node.js service with a central Gateway that connects to messaging platforms (Discord, WhatsApp, Telegram, etc.) and can execute shell commands, control browsers, read/write files, and manage your tools — all triggered by natural language in chat.

### 6.1 Install OpenClaw

The simplest path:

```bash
# Ollama's built-in launcher handles everything
ollama launch openclaw
```

This installs OpenClaw via npm if needed, walks you through model selection, and starts the Gateway. Alternatively, install manually:

```bash
# Manual install
npm install -g openclaw@latest

# Run the onboarding wizard
openclaw onboard --install-daemon
```

The `--install-daemon` flag creates a macOS launchd service so OpenClaw starts automatically on boot and restarts on crash.

### 6.2 Onboarding Wizard Choices

The wizard asks several questions. For your setup:

- **Gateway location:** Local (running on this Mac Mini)
- **LLM provider for cloud tasks:** Anthropic (Claude) — the project creator recommends Anthropic models for stronger prompt-injection resistance, which matters since your agents have shell access
- **Bind address:** `127.0.0.1` (loopback only) — **this is critical for security**. Never use `0.0.0.0`, which exposes the gateway to your entire network
- **Messaging channel:** Discord (for your agent channels)
- **Skills:** Start with minimal skills enabled. Add deliberately.

### 6.3 Configure Ollama as a Model Provider

Edit `~/.openclaw/openclaw.json` to add your local models:

```json
{
 "models": {
 "providers": {
 "ollama": {
 "baseUrl": "http://127.0.0.1:11434/v1",
 "apiKey": "ollama-local",
 "api": "openai-responses",
 "models": [
 {
 "id": "qwen3-coder:30b",
 "name": "Qwen3 Coder 30B",
 "contextWindow": 65536,
 "maxOutput": 16384
 },
 {
 "id": "deepcoder:14b",
 "name": "DeepCoder 14B",
 "contextWindow": 65536,
 "maxOutput": 8192
 },
 {
 "id": "deepseek-r1:14b",
 "name": "DeepSeek R1 14B",
 "contextWindow": 65536,
 "maxOutput": 8192
 },
 {
 "id": "deepseek-r1:8b",
 "name": "DeepSeek R1 8B",
 "contextWindow": 65536,
 "maxOutput": 8192
 }
 ]
 }
 }
 }
}
```

**Important:** The `baseUrl` must include `/v1` at the end, and the `api` field must be `"openai-responses"`. These are the most common config mistakes — without them, OpenClaw connects but gets empty responses.

### 6.4 Security Hardening

OpenClaw can run shell commands, read/write files, and control your browser autonomously. Take security seriously:

```bash
# Keep OpenClaw updated — CVE-2026-25253 was a critical RCE bug
npm update -g openclaw@latest
openclaw --version # Verify 2026.1.29 or later

# Run the built-in security check
openclaw doctor
```

**Key security practices:**
- Keep the Gateway on `127.0.0.1` (loopback only)
- Enable token authentication if exposing to your local network
- Do NOT install unverified skills from ClawHub without reviewing them
- Restrict tool permissions per agent (see multi-agent config below)
- Set API spending limits on your Anthropic account ($20-50/month to start)
- If using a separate OpenClaw user account, agents can't escalate to admin privileges even if exploited

### 6.5 Verify Everything Works

```bash
# Check OpenClaw status
openclaw status --all

# Check gateway is running
curl -s http://127.0.0.1:18789/ > /dev/null && echo "✅ Gateway running"

# Check Ollama connectivity
curl -s http://127.0.0.1:11434/api/tags | jq '.models[].name'

# View logs
openclaw logs --follow
```

---

## Phase 7 — Multi-Agent Discord Configuration

OpenClaw's multi-agent routing lets you run multiple agents on one Gateway, each with its own personality, model, workspace, and tool permissions — bound to specific Discord channels.

### 7.1 Create Discord Bots

You need **one Discord bot per agent**. In the Discord Developer Portal:

1. Create an Application for each agent (e.g., "GameCoder", "GameQA", "GameArchitect")
2. Under Bot settings, enable **Message Content Intent**
3. Copy each bot's token
4. Invite each bot to your Discord server with appropriate permissions

### 7.2 Multi-Agent Configuration

Edit `~/.openclaw/openclaw.json`:

```json
{
 "agents": {
 "list": [
 {
 "id": "coder",
 "workspace": "~/.openclaw/workspace-coder"
 },
 {
 "id": "qa",
 "workspace": "~/.openclaw/workspace-qa"
 },
 {
 "id": "architect",
 "workspace": "~/.openclaw/workspace-architect"
 }
 ]
 },
 "bindings": [
 {
 "agentId": "coder",
 "match": { "channel": "discord", "accountId": "coder-bot" }
 },
 {
 "agentId": "qa",
 "match": { "channel": "discord", "accountId": "qa-bot" }
 },
 {
 "agentId": "architect",
 "match": { "channel": "discord", "accountId": "architect-bot" }
 }
 ],
 "channels": {
 "discord": {
 "groupPolicy": "allowlist",
 "accounts": {
 "coder-bot": {
 "token": "DISCORD_BOT_TOKEN_CODER",
 "guilds": {
 "YOUR_GUILD_ID": {
 "channels": {
 "CODER_CHANNEL_ID": { "allow": true, "requireMention": false }
 }
 }
 }
 },
 "qa-bot": {
 "token": "DISCORD_BOT_TOKEN_QA",
 "guilds": {
 "YOUR_GUILD_ID": {
 "channels": {
 "QA_CHANNEL_ID": { "allow": true, "requireMention": false }
 }
 }
 }
 },
 "architect-bot": {
 "token": "DISCORD_BOT_TOKEN_ARCHITECT",
 "guilds": {
 "YOUR_GUILD_ID": {
 "channels": {
 "ARCHITECT_CHANNEL_ID": { "allow": true, "requireMention": false }
 }
 }
 }
 }
 }
 }
 }
}
```

### 7.3 Agent Workspaces (SOUL.md)

Each agent gets a workspace with personality and behavior files. OpenClaw uses `SOUL.md` (personality), `AGENTS.md` (sub-agent rules), and optionally `USER.md` (knowledge about you).

**~/.openclaw/workspace-coder/SOUL.md:**
```markdown
You are a game developer agent. You write code for games and apps in a monorepo. You follow strict git workflow conventions.

## Your tools
- You have shell access to the monorepo at ~/repos/your-monorepo
- You use ./scripts/git-workflow.sh for all git operations
- You NEVER push directly to main or dev

## Git workflow
1. Start work: ./scripts/git-workflow.sh start <project> <task>
2. Save progress: ./scripts/git-workflow.sh save feat <project> "message"
3. Submit PR: ./scripts/git-workflow.sh submit <project> <task> "message"
4. Check status: ./scripts/git-workflow.sh status

## Commit format
[type][project] short description
Types: feat | fix | refactor | docs | chore | import

## Rules
- Always check WORKSPACE.md before starting — if ACTIVE, ask before proceeding
- Only modify files inside projects/<project-name>/
- Never modify template files unless explicitly told to
- Always update WORKSPACE.md at start (ACTIVE) and end (IDLE)
- Write modular code — one file per game system
```

**~/.openclaw/workspace-qa/SOUL.md:**
```markdown
You are a QA and code review agent. You review code written by other agents for bugs, performance issues, and adherence to project conventions.

## Your tools
- You have read access to the monorepo at ~/repos/your-monorepo
- You can read PRs via the gh CLI
- You can leave review comments on PRs

## Review checklist
- Code compiles and builds without errors
- Logic matches the feature request
- No obvious performance issues for games (frame rate, memory)
- Consistent with existing code style in PROJECT.md
- No hardcoded values that should be configurable
- Game-breaking edge cases considered

## When reviewing
- Be specific about issues — point to exact lines
- Suggest fixes, don't just identify problems
- Check WORKSPACE.md and PROJECT.md for context
```

**~/.openclaw/workspace-architect/SOUL.md:**
```markdown
You are a senior game architect agent. You design systems, plan features, write technical specs, and review complex architectural decisions.

## Your role
- Design game systems before implementation begins
- Write specs in projects/<project>/docs/
- Review PRs for architectural concerns
- Maintain PROJECT.md with decisions and rationale

## When designing systems
- Consider how systems interact (e.g., inventory + combat + UI)
- Write specs that a coding agent can implement without ambiguity
- Include data models, state management, and edge cases
- Reference the project's stack decisions in PROJECT.md
```

### 7.4 Per-Agent Model Assignment

Configure each agent to use the right model by setting defaults in their workspace or in the main config:

| Agent | Model | Why |
|---|---|---|
| coder | `ollama/qwen3-coder:30b` | Best local coding model, fast MoE, 256K context |
| qa | `ollama/deepseek-r1:14b` | Strong reasoning for code review, fits alongside coder |
| architect | `anthropic/claude-sonnet-4` | Complex design needs cloud-grade reasoning |

The coder and QA agents run on local models (free, unlimited, fast). The architect agent uses Claude via API for the deepest reasoning — you can switch it to a local model via OpenClaw's model switching when you want to save API credits.

### 7.5 Agent-to-Agent Communication

OpenClaw supports direct agent-to-agent messaging without routing through Discord. This enables the pipeline you described:

```
Coder agent finishes → sends to QA agent → QA reviews → sends to architect → architect approves or sends back
```

This uses the `agentToAgent` tool in OpenClaw's local workflow mode. You can define this as a Lobster workflow (OpenClaw's built-in pipeline engine) for deterministic orchestration.

---

## Phase 8 — Claude Code Setup

Claude Code is Anthropic's CLI agent. It works alongside OpenClaw — not inside it. The separation is deliberate: OpenClaw handles autonomous coding work, Claude Code handles interactive review and documentation sessions with deeper reasoning.

### 8.1 Install & Authenticate

```bash
npm install -g @anthropic-ai/claude-code

cd ~/repos/your-monorepo
claude
# Follow OAuth flow — authenticates with your Claude Team plan
```

### 8.2 Project Context File (CLAUDE.md)

Create `~/repos/your-monorepo/CLAUDE.md` at repo root:

```markdown
# Monorepo — Games & Apps

## Structure
This is a monorepo. Each project lives in /projects/[name]/ and is fully self-contained. See docs/AGENTS.md for full rules.

## My Role
Claude Code is used for:
- Reviewing PRs from OpenClaw agents (code quality, architecture)
- Writing and maintaining documentation
- Fixing bugs identified during review
- Designing system architecture before implementation

## Rules (from docs/AGENTS.md)
1. Always check WORKSPACE.md before starting — if ACTIVE, stop and notify
2. Always work on a branch — never commit to main or dev directly
3. Always update WORKSPACE.md at start (ACTIVE) and end (IDLE)
4. Always open a PR when work is complete
5. Commit messages: [type][project] description, with Agent + Initiated by
6. Do not modify files outside the current project folder
7. Do not modify template files unless explicitly instructed

## Commit Format
feat[project-name]: short description
Agent: Claude Code
Initiated by: [username]

## Branch Format
agent/[project-name]/[short-task]
```

### 8.3 Claude Code Review Workflow

```bash
cd ~/repos/your-monorepo

# Pull an agent's branch for review
git fetch origin
git checkout agent/space-shooter/player-movement

# Start Claude Code
claude

# Example prompts:
# "Review all changes on this branch compared to dev.
# Check for bugs, performance, and consistency with PROJECT.md."
#
# "Write documentation for the player movement system."
#
# "The collision detection clips at high speed. Find and fix it."
```

---

## Phase 9 — The Review Loop

### 9.1 Current Workflow (Human-in-the-Loop)

```
You (Discord) You (Claude.ai / Claude Code)
 │ │
 │ "Build the inventory system" │
 ▼ │
OpenClaw Coder Agent │
 │ │
 │ Checks WORKSPACE.md → starts branch │
 │ agent/space-shooter/inventory-system │
 │ │
 │ Writes code, commits per convention │
 │ feat[space-shooter] add inventory... │
 │ │
 │ Submits PR, sets WORKSPACE.md → IDLE │
 │ │
 │──── PR on GitHub ────────────────────►│
 │ │
 │ Claude reviews the PR
 │ Checks against PROJECT.md
 │ Leaves comments or approves
 │ │
 │◄─── Review feedback ─────────────────│
 │ │
 │ Agent applies changes on same branch │
 │ fix[space-shooter] address review... │
 │ │
 │──── Updated PR ──────────────────────►│
 │ Claude approves
 │ │
 ▼ ▼
 Human merges PR to dev
 (Eventually: dev → main)
```

### 9.2 Future: Agent-to-Agent Pipeline via Lobster

OpenClaw includes Lobster, a workflow engine for deterministic multi-agent pipelines. This is how you reach the fully automated loop:

```
You: "Build the combat system for dungeon-crawler"
 │
 ▼
 ┌─────────────────┐
 │ Architect Agent │ Cloud model (Claude)
 │ Designs spec │ Branch: agent/dungeon-crawler/combat-design
 │ Commits docs │ WORKSPACE.md → IDLE
 └──────┬──────────┘
 │ agentToAgent handoff
 ▼
 ┌─────────────────┐
 │ Coder Agent │ Local model (qwen3-coder:30b)
 │ Implements spec │ Branch: agent/dungeon-crawler/combat-impl
 │ Opens PR │ WORKSPACE.md → IDLE
 └──────┬──────────┘
 │ agentToAgent handoff
 ▼
 ┌─────────────────┐
 │ QA Agent │ Local model (deepseek-r1:14b)
 │ Reviews PR │ Comments or approves
 └──────┬──────────┘
 │ approved? → auto-merge to dev
 │ rejected? → back to Coder with change requests
 ▼
 Discord notification: "Combat system merged ✅"
```

**Incremental path to get there:**
1. **Now:** Human directs each agent, reviews PRs manually
2. **Next:** Agents auto-submit PRs, Claude Code reviews on a schedule
3. **Later:** Agent-to-agent handoffs via agentToAgent tool
4. **Eventually:** Full Lobster pipeline, human approves only dev → main

---

## Phase 10 — Importing Existing Projects

Per your monorepo standards, the two-commit import process:

```bash
cd ~/repos/your-monorepo

git checkout dev && git pull origin dev
git checkout -b import/card-game

# Commit 1: Template baseline
cp -r templates/template-game-2d/ projects/card-game/
git add projects/card-game/
git commit -m "import[card-game] baseline from template-game-2d

Agent: Claude Code
Initiated by: your-username"

# Commit 2: Overlay actual files
# Copy your existing game files into projects/card-game/
git add projects/card-game/
git commit -m "import[card-game] overlay from Claude artifact

Agent: Claude Code
Initiated by: your-username"

# Fill in PROJECT.md and WORKSPACE.md, then open PR
gh pr create \
 --base dev \
 --title "import[card-game]: initial import from Claude artifact" \
 --body "Importing card game into the monorepo."
```

---

## Phase 11 — Services & Health Check

### Running Services

| Service | Port | Purpose | Auto-Start |
|----------|-------|------------------------|----------------------|
| Ollama | 11434 | Local model serving | `brew services` |
| OpenClaw | 18789 | Agent Gateway | `launchd` daemon |
| SSH | 22 | Remote server access | macOS built-in |

### Health Check Script

Save as `~/repos/your-monorepo/scripts/health-check.sh`:

```bash
#!/bin/bash
echo "=== OpenClaw Game Dev Server ==="
echo ""

# Ollama
echo -n "Ollama (11434): "
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
 MODEL_COUNT=$(curl -s http://localhost:11434/api/tags | jq '.models | length')
 echo "✅ Running ($MODEL_COUNT models available)"
 curl -s http://localhost:11434/api/tags | jq -r '.models[].name' | sed 's/^/ /'
else
 echo "❌ Down"
fi

echo ""

# OpenClaw Gateway
echo -n "OpenClaw (18789): "
if curl -s http://127.0.0.1:18789/ > /dev/null 2>&1; then
 echo "✅ Gateway running"
else
 echo "❌ Down — try: openclaw gateway"
fi

echo ""
echo "=== Workspace Status ==="
cd ~/repos/your-monorepo 2>/dev/null
for ws in projects/*/WORKSPACE.md; do
 [[ -f "$ws" ]] || continue
 project=$(echo "$ws" | cut -d'/' -f2)
 status=$(grep "Status:" "$ws" | head -1)
 echo " $project: $status"
done

echo ""
echo "=== Agent Branches ==="
git fetch origin --prune 2>/dev/null
git branch -a 2>/dev/null | grep "agent/" | sed 's/^/ /'

echo ""
echo "=== Open Pull Requests ==="
gh pr list 2>/dev/null || echo " (none)"

echo ""
echo "=== System ==="
echo "Memory: $(memory_pressure 2>/dev/null | grep 'System-wide' | head -1)"
echo "Uptime: $(uptime)"
```

```bash
chmod +x ~/repos/your-monorepo/scripts/health-check.sh
```

---

## Phase 12 — Quick Reference

### Daily Workflow Commands

```bash
# SSH into server
ssh your-user@openclaw-server.local

# Health check
~/repos/your-monorepo/scripts/health-check.sh

# Check OpenClaw status
openclaw status --all

# View OpenClaw logs
openclaw logs --follow

# Start Claude Code for a review session
cd ~/repos/your-monorepo
git fetch origin && git checkout agent/space-shooter/player-movement
claude

# Check all workspace statuses
./scripts/git-workflow.sh status
```

### What Goes Where

| Task | Tool | Why |
|---|---|---|
| "Build this feature" | OpenClaw coder (Discord) | Local model, unlimited, fast |
| "Review this PR" | Claude Code or Claude.ai | Deep reasoning, catches issues |
| "Write docs" | Claude Code or Claude.ai | Best technical writing |
| "Fix this bug" | OpenClaw coder (Discord) | Fast iteration on local model |
| "Design architecture" | OpenClaw architect or Claude.ai (Opus) | Complex system design |
| "QA this code" | OpenClaw QA (Discord) | Automated review on local model |
| "Import existing project" | Claude Code | Follows import process |
| "Start a new game" | Human + template | Pick template, copy to projects/ |

### What's Intentionally NOT Here

**LiteLLM** — OpenClaw handles model routing natively between local Ollama and cloud providers. No proxy needed.

**ChromaDB / Vector Store** — GitHub is the shared state. Add later if you need semantic search over a large doc corpus.

**Docker** — Single-purpose server. Native Ollama + OpenClaw gives better Apple Silicon GPU access than containerizing.

**CI/CD deployment** — Covered separately per project via Netlify config in PROJECT.md, per your monorepo standards.
