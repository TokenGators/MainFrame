# Contributing to GATORRR

Thank you for your interest in contributing to GATORRR! This document outlines the guidelines and processes for both human contributors and agent contributors.

## How to Contribute

### For Humans
1. Fork the repository
2. Create a feature branch from `dev`
3. Make your changes
4. Submit a pull request against the `dev` branch
5. Ensure all tests pass
6. Address any feedback from code review

### For Agents (OpenClaw)
1. Use the agent workflow: `./scripts/git-workflow.sh start gatorrr <task>`
2. Create changes in your feature branch
3. Commit using the proper format: `./scripts/git-workflow.sh save <type> gatorrr "<message>"`
4. Submit PR: `./scripts/git-workflow.sh submit gatorrr <task> "<title>"`

## Branch Naming Convention

All branches must follow this pattern:
```
agent/[project]/[short-task-description]
```

Examples:
- `agent/gatorrr/fix-game-crash`
- `agent/gatorrr/add-new-feature`
- `agent/gatorrr/refactor-movement-system`

## Commit Message Format

Commit messages should follow this format:
```
[type][project] short description

Agent: [Agent name] (e.g., Claude, OpenClaw)
Initiated by: [Human username or agent]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `docs` - Documentation changes
- `chore` - Maintenance tasks
- `import` - External library imports

Examples:
```
[feat][gatorrr] Add new collision detection system

Agent: OpenClaw (Ride Engineer)
Initiated by: Murphy
```

```
[fix][gatorrr] Resolve gator movement clipping issue

Agent: Claude (claude.ai)
Initiated by: Kthings
```

## Pull Request Requirements

### Before Submitting
1. Ensure all tests pass locally
2. Verify code follows existing style conventions
3. Update documentation if needed
4. Add comments for complex logic
5. Keep commits focused and atomic

### PR Template
When creating a pull request, please use this template:
```
## Summary
Brief description of what this PR does

## Changes
- List of changes made
- Key features implemented
- Bugs fixed

## Testing
How was this tested locally?

## Related Issues
Link to any related issues or discussions
```

### Review Process
1. All PRs require at least one review
2. CI checks must pass
3. Code must be clean and well-documented
4. Performance impact should be minimal or justified

## Agent Pipeline

### Workflow for Agents
1. **Start**: `./scripts/git-workflow.sh start gatorrr <task>`
2. **Work**: Make changes in the branch
3. **Save**: `./scripts/git-workflow.sh save <type> gatorrr "<message>"`
4. **Submit**: `./scripts/git-workflow.sh submit gatorrr <task> "<title>"`

### Agent-Specific Guidelines
- Agents should follow the same commit message format as humans
- All work must be done within the project's directory (`projects/gatorrr/`)
- Agents cannot modify files outside their project folder
- Agents must update WORKSPACE.md at start and end of tasks

## Code Style Guidelines

### JavaScript
- Follow ES6+ standards
- Use camelCase for variables and functions
- Use PascalCase for constructors/classes
- Keep lines under 80 characters where possible
- Add JSDoc comments for public APIs

### File Structure
- All project files should be within `projects/gatorrr/`
- Documentation goes in `docs/` directory
- Assets go in `public/assets/`
- Source code in `src/` directory

## Reporting Issues

### Bug Reports
When reporting bugs, please include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Environment details (browser, OS, etc.)

### Feature Requests
When requesting features, please include:
1. Description of the feature
2. Use case for the feature
3. Priority level (low/medium/high)

## License

By contributing to GATORRR, you agree that your contributions will be licensed under the MIT License.