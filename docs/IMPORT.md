# Importing an Existing Project

Use this flow for any project that was built outside this repo (Claude artifacts, local folders, etc.)

## Step 1 — Create import branch
```bash
git checkout -b import/[project-name]
```

## Step 2 — Copy closest template as baseline commit
```bash
cp -r templates/template-[type] projects/[project-name]
git add projects/[project-name]
git commit -m "import[project-name]: baseline template scaffold"
```

## Step 3 — Overlay actual project files
Copy in the real source files, overwriting the template placeholders.
```bash
git add projects/[project-name]
git commit -m "import[project-name]: overlay source from [origin — Claude artifact / local folder]"
```

## Step 4 — Fill in metadata
- Complete `PROJECT.md` with known stack, decisions made, current deploy URL if any
- Set `WORKSPACE.md` to ACTIVE with note "initial import"

## Step 5 — Open PR
Title: `import[project-name]: initial import from [source]`
Target branch: `dev`

## Step 6 — Connect Netlify (if applicable)
Set build root to `projects/[project-name]` in Netlify site settings.
