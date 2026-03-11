# OpenClaw User Guide

Complete guide for end users (developers, designers, operators) on how OpenClaw works, what to expect, and how to work effectively with the system.

---

## What is OpenClaw?

OpenClaw is a **locally-hosted AI assistant system** that runs on your machine. It provides:

- **Persistent agents** (like me, Donna) that maintain continuity across sessions
- **Access to your workspace** — files, configuration, memory
- **Integration with GitHub** — push code, manage PRs, track issues
- **Background jobs** — cron-based automation, reminders, scheduled tasks
- **Multi-channel messaging** — Discord, Telegram, etc.

Think of it as a **personal ops manager that never sleeps** — it handles setup, organization, and follow-up work so you can focus on creative/strategic tasks.

---

## How OpenClaw Sessions Work

### Session Types

**Main Session**
- Your direct conversation with an agent (me, Donna)
- Has full access to your workspace and memory
- Used for requests, decisions, check-ins, urgent work
- This conversation is in the main session

**Sub-Agent Sessions**
- Isolated sessions spawned for specific tasks
- Examples: code reviews, GitHub issue handling, long-running jobs
- Can be short-lived (one-shot) or persistent (threads)
- Report results back to main session

**Discord/Slack Threads**
- Persistent agent conversations in group chats
- Agents spawn in thread-bound mode for collaboration
- Used for team work, code reviews, project updates

---

## What I (Donna) Have Access To

### ✅ **Always Available**

1. **Current conversation history** — Everything you've said in this session/thread
2. **Workspace files** — `/home/parkoperator/.openclaw/workspace-donna/`
   - SOUL.md, AGENTS.md, USER.md, IDENTITY.md
   - Tools.md, HEARTBEAT.md
   - docs/ folder (all documentation)
3. **GitHub integration** — Read repos, create/merge PRs, manage issues
4. **System information** — Time, date, hostname, available tools
5. **Your Discord/Slack channels** — Can read/send messages where configured

### ✅ **Per-Session Available**

1. **Thread context** — Full message history in this Discord thread
   - This GitHub Config thread has 30+ messages of setup work
   - I can retrieve all of it via `sessions_history`

2. **Memory files** — Searchable via `memory_search`
   - MEMORY.md — Your curated long-term memories
   - memory/YYYY-MM-DD.md — Daily notes
   - Topic-specific files (e.g., memory/GITHUB_LEARNINGS.md)

### ❌ **NOT Available**

1. **Other users' private messages** — Only channels I'm configured for
2. **Browser history** — I can browse the web, but don't store session
3. **Passwords/secrets** — Only access via env vars (GH_TOKEN, etc.)
4. **Past sessions** — Each session is fresh unless files document it
5. **Real-time system monitoring** — I can check, but don't continuously watch

---

## The Three Types of Continuity

### 1. **File Continuity** (Most Important)

**What persists:** Files in your workspace

- MEMORY.md, daily notes, documentation
- GitHub repos and commit history
- Workspace configuration files

**How to use it:** Write important things down. If it's not in a file, it's gone.

**Example:**
```markdown
# MEMORY.md
## GitHub Setup
- Monorepo at TokenGators/MainFrame
- Branch protection on main/dev
- Import process: baseline template → overlay files
```

### 2. **Thread Continuity** (This Conversation)

**What persists:** Messages in this Discord thread

- All GitHub setup work from 3/9 is here
- All decisions about structure are documented
- Links to PRs, commits, documentation

**How to use it:** Reference earlier messages in the same thread

**Example:** "As we discussed on 3/9 when setting up MainFrame..."

### 3. **Session Continuity** (Current Conversation)

**What persists:** Messages in your current OpenClaw session/window

- This conversation (GitHub Config thread)
- File edits I make this session
- Context about what I just did

**How to use it:** Ask follow-up questions without re-explaining

**Example:** "Merge PR #5" (I remember we were working on Gatorrr)

---

## How to Maximize Continuity

### DO: Write It Down

- **Important decisions** → MEMORY.md or memory/[topic].md
- **Project status** → PROJECT.md, WORKSPACE.md
- **Lessons learned** → memory/learnings-[date].md
- **Team knowledge** → docs/ (shared docs in GitHub)

### DO: Use Threads for Collaboration

- **Discord threads** = Persistent, visible, auditable
- **Best for:** Code reviews, project updates, team decisions
- **Reference:** "@Donna can you explain [thing from earlier]?"

### DO: Update Workspace Files

- SOUL.md — Who I am, how I work
- USER.md — Who you are, what you care about
- HEARTBEAT.md — What to check periodically
- AGENTS.md — How agents work in your setup

### DON'T: Rely on Verbal Memory

- I don't retain facts between sessions unless filed
- "We talked about this before" only works if documented
- Assume I remember decisions without GitHub/file evidence

---

## What "Memory Search" Actually Does

When I run `memory_search("github setup")`:

1. **Searches MEMORY.md** for "github setup"
2. **Searches memory/*.md files** for matching content
3. **Returns top snippets** with file path + line numbers
4. **Does NOT search:**
   - Past Discord messages (unless I explicitly `sessions_history`)
   - Private files outside workspace
   - GitHub repo contents directly

**Example output:**
```
Source: memory/GITHUB_LEARNINGS.md#45
"Lesson: Single monorepo is easier than separate repos"

Source: MEMORY.md#12
"GitHub setup: TokenGators/MainFrame on main/dev"
```

Then I can use `memory_get` to read the full context from that file.

---

## How to Talk to Me Effectively

### ✅ DO

**Be specific about context:**
- "In the GitHub Config thread, we decided X"
- "See GITHUB_SETUP_GUIDE.md for the full process"
- "Per MURPHY_DEVELOPMENT_GUIDE.md, developers use agent/ branches"

**Reference files I created:**
- "Update WORKSPACE.md to ACTIVE"
- "Check PROJECT.md for the stack"
- "Follow DEVELOPER_WORKFLOW.md"

**Give me time to search:**
- "Remind me what we decided about GitHub self-approval?"
- I'll search memory, thread history, and files
- Then give you the answer with sources

**Ask me to document:**
- "Save this learning to memory"
- "Create a guide for X"
- "Push the docs to GitHub"

### ❌ DON'T

**Assume I remember:**
- Don't say "like we did last week" without a file reference
- Don't reference conversations from other channels/threads
- Don't assume past decisions are still context

**Give vague requests:**
- "Handle GitHub stuff" (which part?)
- "Do the thing we talked about" (when? where?)
- "Check if it's done" (what specifically?)

**Expect me to guess:**
- I work best with explicit instructions
- If unsure, ask: "Should I X or Y?"
- I'm happy to ask clarifying questions

---

## The Workspace Structure

Your workspace lives at: `/home/parkoperator/.openclaw/workspace-donna/`

```
workspace-donna/
├── SOUL.md                      ← Who I am
├── AGENTS.md                    ← How I work
├── USER.md                      ← Who you are
├── IDENTITY.md                  ← My persona
├── TOOLS.md                     ← Local tool notes
├── HEARTBEAT.md                 ← Periodic checks
├── MEMORY.md                    ← Long-term memory ⭐
├── memory/
│   ├── GITHUB_LEARNINGS.md     ← Topic-specific
│   ├── 2026-03-09.md           ← Daily log
│   └── 2026-03-10.md
├── docs/
│   ├── GITHUB_SETUP_GUIDE.md
│   ├── GITHUB-MONOREPO-ARCHITECTURE.md
│   ├── DEVELOPER_WORKFLOW.md
│   ├── MURPHY_DEVELOPMENT_GUIDE.md
│   └── OPENCLAW_USER_GUIDE.md   ← This file
└── [other files as needed]
```

### Key Files

**SOUL.md** — My personality and operating principles
- Read this to understand how I approach work
- Defines what I will/won't do
- Your baseline for my behavior

**MEMORY.md** — Critical information
- Decisions you want to remember long-term
- Project status, context, people
- Updated periodically from daily notes

**memory/YYYY-MM-DD.md** — Daily activity log
- What happened each day
- Raw notes, decisions, links
- Archive of thinking

**docs/** — Team documentation
- Push to GitHub for shared access
- Reference by developers
- Living documentation

---

## GitHub Integration

### What I Can Do

- ✅ Clone/push repositories
- ✅ Create branches, commits, PRs
- ✅ Merge PRs (with admin privileges)
- ✅ List issues, filter by label/status
- ✅ Create/update documentation
- ✅ Verify branch protection rules

### What I Need From You

- **GH_TOKEN** in environment (personal access token)
- **Proper scopes:** repo, workflow, gist, read:org
- **Clear instructions:** "Create PR to dev", "Merge PR #5"
- **Approval when needed:** Some PRs need human review

### Workflow I Follow

1. Create feature branch: `agent/[project]/[task]`
2. Commit with format: `[type][project] description`
3. Push to GitHub
4. Create PR to `dev` (never `main`)
5. Wait for approval (or use `--admin` to merge)
6. Document what I did

See **DEVELOPER_WORKFLOW.md** for full details.

---

## How to Request Work

### Best Format

```
Task: [One clear sentence]

Context: [Why this matters, any background]

Expected output: [What "done" looks like]

Files to reference:
- GITHUB_SETUP_GUIDE.md (for similar work)
- memory/GITHUB_LEARNINGS.md (for lessons)
```

### Examples

**Good:**
"Create a GITHUB_SETUP_GUIDE.md that explains authentication, repo structure, branch protection, importing projects, developer workflow, and common issues. Push to MainFrame/docs/ via PR."

**Also good:**
"Merge PR #5 (Gatorrr src folder) to main using admin privileges."

**Not great:**
"Do GitHub stuff"
"Handle the repo"
"Make it work"

### What I'll Ask If Unclear

- "Should I create a new branch or use an existing one?"
- "Which file/section should this update?"
- "What's the priority — now, today, this week?"
- "Do you want me to ask for approval or just merge?"

---

## Important Constraints

### Rate Limiting
- GitHub API has limits (5000 requests/hour for auth'd user)
- I batch requests when possible
- Shouldn't hit limits in normal use

### File Permissions
- I can read/write files in workspace
- I cannot access other users' private data
- I cannot modify files outside workspace without explicit path

### Network Access
- I can web search and fetch URLs
- I cannot make arbitrary network requests
- GH_TOKEN is used only for GitHub API

### Destructive Operations
- I **ask before** deleting repos, large branches, or important files
- I use `trash` instead of `rm` when possible
- I confirm before merging to `main` (protected branch)

---

## Timeframe Expectations

### Immediate (This Conversation)
- Answer questions
- Make file edits
- Create documentation
- Execute simple commands

### Same Day
- Set up GitHub repos
- Import projects
- Create PRs
- Handle merge requests

### Next Day
- Reference decisions from yesterday via files/thread
- Continue work from previous state
- Ask for context if needed

### Across Sessions
- **I read:** MEMORY.md, daily notes, files
- **I ask:** "Did we decide X?" or "What's the status?"
- **You benefit:** Continuity via documentation

---

## Common Scenarios

### Scenario 1: "I need to remember something"

**You say:** "Save this to memory: The new server uses OpenClaw on Ubuntu, Windows VM for dev, MainFrame monorepo at TokenGators/MainFrame"

**I do:** 
1. Update MEMORY.md with this info
2. Commit to workspace
3. Confirm: "Saved to MEMORY.md line X"

**Later:** memory_search("new server") returns this info

---

### Scenario 2: "What did we decide about X?"

**You say:** "What did we decide about GitHub branch protection?"

**I do:**
1. memory_search("branch protection")
2. memory_search("github rules")
3. sessions_history to check thread
4. Return sources: "Per GITHUB_SETUP_GUIDE.md, main requires 1 approval..."

**You get:** Answer + source files

---

### Scenario 3: "Continue work from yesterday"

**You say:** "Pick up where we left off with the GitHub setup on the new server"

**I do:**
1. memory_search("new server github")
2. Read GITHUB_SETUP_GUIDE.md
3. Check GITHUB_LEARNINGS.md
4. Ask: "Are we at Phase 1 (auth) or Phase 3 (branch rules)?"
5. Continue from that point

**You benefit:** No context loss

---

### Scenario 4: "Murphy needs instructions"

**You say:** "Create a developer guide for Murphy and push to GitHub/docs"

**I do:**
1. Create MURPHY_DEVELOPMENT_GUIDE.md
2. Save to workspace
3. Create branch: agent/docs/murphy-guide
4. Commit and push
5. Create PR to dev
6. Confirm PR link: "https://github.com/TokenGators/MainFrame/pull/X"

**Team benefits:** Reference guide in repo

---

## Best Practices

### 1. **Use Threads for Ongoing Work**

This GitHub Config thread has been continuously building GitHub setup knowledge. It's a single conversation that grows over time.

- Thread = context preservation
- Updates = documented in sequence
- Reference = "As we decided in the GitHub Config thread..."

### 2. **Write Everything Down**

- Decisions → MEMORY.md
- Instructions → docs/
- Learnings → memory/[topic].md
- Status → PROJECT.md, WORKSPACE.md

**Text > Brain** — I don't retain facts between sessions, files do.

### 3. **Make Requests Explicit**

- "Merge PR #5 with admin privileges"
- "Update MEMORY.md with the new server details"
- "Create DEVELOPER_GUIDE.md and push to GitHub/docs"

Not: "Do GitHub stuff" or "Handle the memory thing"

### 4. **Reference Everything**

- "Per GITHUB_SETUP_GUIDE.md section Phase 3..."
- "As we discussed in the GitHub Config thread..."
- "See MEMORY.md for context on the new server"

This helps both of us stay aligned.

### 5. **Trust the System**

- If it's in a file, I can access it
- If you need to remember something, write it down
- Threads preserve context over days/weeks
- Continuity works if documentation is maintained

---

## Troubleshooting

### "I asked Donna to do X but she started over"

**Likely causes:**
- Didn't reference a file or thread
- Request was in a different conversation/channel
- Memory files weren't updated with context

**Fix:** "Here's the context: [link to file/thread], please continue from [specific point]"

### "Information from last week is gone"

**Likely cause:** Wasn't written to a file (MEMORY.md, memory/YYYY-MM-DD.md, docs/)

**Fix:** Document it now, reference for future

### "She's treating this as a new request"

**Likely cause:** No file reference, no thread link, no memory entry

**Fix:** Say "Per [file], we already decided X. Please continue with Y."

---

## Your Action Items

### To Set Up This System:

1. ✅ **Read SOUL.md** — Understand how I work
2. ✅ **Read AGENTS.md** — How agents work in OpenClaw
3. ✅ **Update USER.md** — Tell me about you
4. ✅ **Update MEMORY.md** — Document critical context
5. ✅ **Create memory/daily files** — Log what happens
6. ✅ **Review docs/** — All team documentation

### To Use This System Well:

1. **When you decide something:** Write it to MEMORY.md
2. **When you learn something:** Write to memory/[topic].md
3. **When you create instructions:** Put in docs/ and push to GitHub
4. **When you ask me something:** Reference the file or thread
5. **When I get lost:** Remind me where to look

---

## Summary

OpenClaw works best when:

| Aspect | DO | DON'T |
|--------|-----|--------|
| **Memory** | Write important things to files | Assume I remember conversations |
| **Continuity** | Reference files/threads explicitly | Expect verbal memory to persist |
| **Requests** | Be specific and detailed | Give vague instructions |
| **Context** | Link to MEMORY.md, GitHub, threads | Assume I know what you mean |
| **Documentation** | Keep docs updated in GitHub | Leave decisions unrecorded |

---

## Questions?

If anything in this guide is unclear:
- Ask me directly in any conversation
- I'll clarify and update this doc
- Goal is mutual understanding

Think of this guide as a "contract" — here's how I work, here's what you need to know, here's how we work together best.

Welcome to OpenClaw. 🚀
