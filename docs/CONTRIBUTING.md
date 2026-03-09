# Contributing (Humans)

## Starting new work
1. Pick a template from `/templates/` — see [TEMPLATES.md](TEMPLATES.md)
2. Copy it to `/projects/[your-project-name]/`
3. Create a branch: `human/[project-name]/[task]`
4. Fill in `PROJECT.md` and `WORKSPACE.md`

## Reviewing agent PRs
- Check that `WORKSPACE.md` is set back to IDLE
- Check that `PROJECT.md` reflects any new stack decisions made during the work
- Merge to `dev`, then promote `dev` → `main` when ready to deploy

## Merging to main
Only humans merge to `main`. After merging, verify the deploy (Netlify or otherwise) succeeded.
