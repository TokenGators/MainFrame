# GATORRR Sprite Assets

Place sprite PNG files here for Phase 2 visual integration.

## Required Sprites

- **frog.png** — Frog sprite (24×24 px recommended)
  - Used for enemy frogs
  - Fallback: Red square (24×24 px)

- **gator.png** — Gator sprite (32×32 px recommended)
  - Player-controlled character
  - Source reference: `/spacengators/public/enemy-gator-reference.png`
  - Fallback: Green square (32×32 px)

- **lily_pad.png** — Lily pad sprite (32×32 px recommended)
  - Home landing zones for frogs (left-edge knockouts)
  - Fallback: Yellow/gold circle (radius 16 px)

## Notes

- All paths are relative to `/public/assets/` folder
- Phaser will automatically scale sprites to `setDisplaySize()` calls
- Sprites are optional; game falls back to colored shapes if not found
- No console errors if sprites are missing (graceful fallback)
- Follow Space-N-Gators pattern: sprites in public/, loaded by filename

## Status

Phase 2 development: Assets infrastructure ready, awaiting sprite files.

## Example Loading

```javascript
// In preload():
this.load.image('frog', 'assets/frog.png');
this.load.image('gator', 'assets/gator.png');
this.load.image('lily_pad', 'assets/lily_pad.png');

// In create():
if (this.textures.exists('frog')) {
  const frog = this.add.sprite(x, y, 'frog');
  frog.setDisplaySize(24, 24);
} else {
  const frog = this.add.rectangle(x, y, 24, 24, 0xff0000);
}
```
