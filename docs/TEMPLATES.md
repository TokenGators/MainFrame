# Starting a New Project

## Step 1 — Pick a template

| Template | Use for |
|---|---|
| `template-web-app` | React + Vite web apps |
| `template-game-2d` | 2D/casual browser games (Phaser 3) |
| `template-game-3d` | 3D browser games (Three.js) |
| `template-game-rpg` | Narrative/RPG browser games (Phaser 3 + Tiled) |
| `template-mobile-rn` | Mobile games/apps (React Native + Expo) |

## Step 2 — Copy the template
```bash
cp -r templates/template-game-2d projects/my-new-game
```

## Step 3 — Fill in the metadata
- Edit `projects/my-new-game/PROJECT.md` with stack, deploy target, decisions
- Edit `projects/my-new-game/WORKSPACE.md` to set Status and who is working on it

## Step 4 — Create your branch and start working
```bash
git checkout -b agent/my-new-game/initial-build
# or
git checkout -b human/my-new-game/initial-build
```
