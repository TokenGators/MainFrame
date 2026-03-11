# Gator Frogger - Log Column Layout Specification (Updated for 320x180)

## Rendering Context
- **Internal resolution:** 320x180 (upscaled 4x to 1280x720)
- **Tile size:** 16px
- **Grid:** 20 columns x 11 rows (usable play area: rows 1-10)
- **Color palette:** PICO-8 (16 colors only)

## Log Column Layout

### Horizontal Axis (River Width Coverage)
- **Total columns:** 15
- **Column width:** 16px each (1 tile)
- **River width:** 15 x 16px = 240px
- **River occupies:** cols 2-16 (x=32 to x=272)
- **Column spacing:** 0px (no gaps between columns)
- **Pattern:** LOG | LOG | LOG | ... | LOG (15 continuous columns)

### Log Dimensions (Variable Height)
- **Smallest log:** 2 tiles tall (2 x 16px = 32px)
- **Biggest log:** 4 tiles tall (4 x 16px = 64px)
- **Log width:** 10px (centered within 16px column)
- **Height selection:** Randomized per log when spawning
- **Options:** 2, 3, or 4 tiles tall
- **Color:** Brown (`0xAB5236` from PICO-8 palette)

### Vertical Axis (Logs Within Each Column)
- **Logs per column:** 3-5 logs (continuous wrapping, infinite scroll)
- **Vertical gaps between logs:** Randomized on spawn
  - Option 1: **16px** (1 tile gap)
  - Option 2: **32px** (2 tile gap)
  - Option 3: **48px** (3 tile gap)
  - Option 4: **64px** (4 tile gap)
- **Selection:** Random choice per log spawn
- **Result:** Unpredictable but navigable gaps for gator (16x16 sprite)

### Direction & Speed
- **Direction:** Alternating UP/DOWN per column (col 2 UP, col 3 DOWN, col 4 UP, etc.)
- **Speed:** 8-20 px/sec per column (randomized at level start)
- **Wrapping:** Logs that move off-screen reappear on the opposite edge

## Visual Layout

### Grid View (320x180)
```
Col: 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19
     |LB|LP|  RIVER (15 log columns, 240px)             |-- RB --|

Within each log column:
  [LOG 32px]    <- 2 tiles tall
  [gap 16px]
  [LOG 64px]    <- 4 tiles tall
  [gap 32px]
  [LOG 48px]    <- 3 tiles tall
  [gap 48px]
  ... (wrapping)
```

## Implementation Details

### Log Spawning Logic
```
For each of 15 columns (cols 2-16):
  columnX = col * 16 + 8  // center of column
  direction = (col % 2 === 0) ? 1 : -1  // alternating
  speed = randomBetween(8, 20) * direction

  Fill column with logs vertically:
    startY = randomBetween(-32, 0)  // offset start
    For each log:
      heightTiles = randomChoice([2, 3, 4])
      logHeightPx = heightTiles * 16
      gapPx = randomChoice([16, 32, 48, 64])
      create log at (columnX, currentY, 10, logHeightPx)
      currentY += logHeightPx + gapPx
    Repeat until off-screen, then wrap
```

### Gator Navigation
- Gator is 16x16, moves in 16px grid steps
- Minimum gap is 16px (1 tile) = exactly gator-sized, tight squeeze
- Maximum gap is 64px (4 tiles) = easy passage
- Navigation is always possible but varies by column configuration
- Gator takes -1 HP on log collision (with 500ms cooldown)

### Frog Navigation
- Frogs move LEFT across all 15 columns (grid-based hopping)
- Each hop = 1 tile (16px) in UP, DOWN, or LEFT direction
- Frogs detect logs and ride them vertically (ON_LOG state)
- Frogs progress leftward until reaching lily pad zone (col 1)

---

## Frog Movement (Grid-Based Hopping)

### Decision Timer
- **Interval:** 500ms (0.5 seconds)
- **Uses Phaser delta time** (NOT hardcoded `+= 16`)
- **No smooth animation** - movement is discrete (instant jump)

### Movement Mechanics
- **Movement unit:** 1 tile = 16 pixels
- **Per decision:** Frog makes ONE jump (or stays still)
- **Jump probability:** 60% jump, 40% wait
- **Grid alignment:** Frogs snap to 16px grid at all times

### Jump Directions
- **Allowed:** UP, DOWN, LEFT only
- **Never RIGHT** - frogs always progress toward lily pads
- **Direction selection:** Equal probability among UP/DOWN/LEFT

### Visual Representation
- **Size:** 16x16 px (NOT 24x24)
- **Colors (PICO-8 palette):**
  - Red (`0xFF004D`): SWIMMING
  - Orange (`0xFFA300`): ON_LOG
  - Pink flash (`0xFF77A8`): VULNERABLE (waiting > 2s)

---

## Lily Pads

### Location
- **Zone:** Col 1 (lily pad knockout column)
- **X position:** col 1, center x=24
- **Grid bounds for reaching pads:** frog.gridCol <= 1

### Pad Placement
- **Count:** 5 lily pads
- **Spacing:** Distributed vertically in play area
- **Sprite:** 16x16 px
- **Colors (PICO-8 palette):**
  - Empty: Dark Green (`0x008751`)
  - Filled: Dark Red (`0x7E2553`)

### Positions
| Pad | Grid (col, row) | Pixel Center (x, y) |
|-----|-----------------|---------------------|
| 1 | (1, 2) | (24, 40) |
| 2 | (1, 4) | (24, 72) |
| 3 | (1, 5) | (24, 88) |
| 4 | (1, 7) | (24, 120) |
| 5 | (1, 9) | (24, 152) |

### Win/Lose Conditions
- Frog reaches col <= 1 and is near an unfilled pad -> pad fills
- All 5 pads filled -> GAME OVER (lose)
- Gator eats 10 frogs -> WIN

---

## Frog Spawn Behavior

### Spawn Parameters
- **Max active frogs:** 6-8 (randomized per wave)
- **Spawn location:** col 17, center x=280, random row (1-10)
- **Spawn interval:** 1500-2250ms (25% faster than original)
- **Grid alignment:** Spawned on 16px grid

### Spawn Mechanics
1. Check current frog count vs. random max (6-8)
2. If count < max, spawn new frog
3. Position: Grid-aligned on right bank (col 17, random row)
4. State: SWIMMING (initial)
5. Decision timer: Starts at 0 (first decision in 500ms)

---

## Reconciliation Notes

Values updated from original spec to fit 320x180 retro canvas:

| Parameter | Original (800x600) | Updated (320x180) |
|-----------|--------------------|--------------------|
| Tile size | 32px | 16px |
| River width | 480px (15x32) | 240px (15x16) |
| River X range | 80-560 | 32-272 |
| Log width | 20px | 10px |
| Log height | 2-6 units (64-192px) | 2-4 tiles (32-64px) |
| Gaps | 0-192px | 16-64px |
| Speed | 16-30 px/sec | 8-20 px/sec |
| Frog size | 24x24 | 16x16 |
| Lily pad X | 48 | 24 (col 1 center) |
| Spawn X | 560 | 280 (col 17 center) |

**Ready to implement? Y/N**
