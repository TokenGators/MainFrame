# Gator Frogger - Log Column Layout Specification

## Current Problem
- 8 log columns with visible gaps between them (1.5x log width = 30px gap)
- Pattern: LOG | GAP | LOG | GAP | LOG ... (8 logs + 7 empty columns)
- Creates sparse river with too much empty space

## New Specification (APPROVED)

### Horizontal Axis (River Width Coverage)
- **Total columns:** 15 (not 8)
- **Column width:** 32px each
- **River width:** 15 × 32px = 480px (fills 80% of 600px screen width)
- **Column spacing:** 0px (NO gaps between columns)
- **Coverage:** Every single column contains logs
- **Pattern:** LOG | LOG | LOG | LOG | LOG ... | LOG (15 continuous columns, no empty space)

### Log Dimensions (Variable Height)
- **Smallest log:** 2 units tall (2 × 32px = 64px)
- **Biggest log:** 6 units tall (6 × 32px = 192px)
- **Log width:** Always 20px (remains constant)
- **Height selection:** Randomized per log when spawning
- **Options:** 2, 3, 4, 5, or 6 units tall

### Vertical Axis (Logs Within Each Column)
- **Logs per column:** 3-4 logs (continuous wrapping, infinite scroll)
- **Vertical gaps between logs:** RANDOMIZED on spawn
  - Option 1: **0px** (logs touching/adjacent)
  - Option 2: **32px** (1 unit gap)
  - Option 3: **64px** (2 unit gap)
  - Option 4: **96px** (3 unit gap)
  - Option 5: **128px** (4 unit gap)
  - Option 6: **160px** (5 unit gap)
  - Option 7: **192px** (6 unit gap)
- **Selection:** Random choice per log spawn
- **Result:** Unpredictable but navigable gaps for gator (32×32 sprite)

## Visual Layout

### Current (Wrong)
```
|LOG|gap|LOG|gap|LOG|gap|LOG|gap|LOG|gap|LOG|gap|LOG|gap|LOG|
```
(8 logs, 7 empty columns)

### New (Correct)
```
|LOG|LOG|LOG|LOG|LOG|LOG|LOG|LOG|LOG|LOG|LOG|LOG|LOG|LOG|LOG|
```
(15 logs, 0 empty columns)

**Within each column, logs have:**
- **Random heights:** 2-6 units tall (64-192px)
- **Random spacing:** 0, 32, 64, 96, 128, 160, or 192px apart

## Implementation Details

### River Dimensions
- **Horizontal:** 15 columns × 32px = 480px wide
- **Left edge:** x = 80 (left bank)
- **River occupies:** x = 80 to x = 560 (480px)
- **Right edge:** x = 560 (right bank starts)
- **Note:** Adjust screen layout if needed (river is 480px, was 640px before)

### Log Spawning Logic
```
For each of 15 columns:
  For each column, spawn logs vertically:
    - Initial Y position: random
    - For each log:
      - randomHeight = randomly choose from [2, 3, 4, 5, 6] units
      - logHeightPx = randomHeight × 32
      - randomGap = randomly choose from [0, 32, 64, 96, 128, 160, 192]
      - nextLogY = currentLogY + logHeightPx + randomGap
    - Repeat until off-screen, then wrap around
```

### Gator Navigation
- Gator can move through gaps between logs (minimum 0px, up to 192px)
- Logs vary in height (2-6 units = 64-192px tall)
- Some columns might have logs touching (0px gap) → tight squeeze
- Some columns might have 192px gaps → easy passage
- Taller logs (6 units) require more careful navigation
- Navigation is always possible but varies by column configuration

### Frog Navigation
- Frogs move left (east-to-west) across all 15 columns
- Detect logs in current column
- Jump to logs or wait in water
- Same smart AI applies to all 15 columns

## Approval Checklist
- ✅ 15 total columns (not 8)
- ✅ Each column 32px wide
- ✅ No gaps between columns (continuous coverage)
- ✅ Every column has logs
- ✅ Log heights: Variable (2-6 units tall = 64-192px)
- ✅ Vertical gaps within columns: randomly 0, 32, 64, 96, 128, 160, or 192px
- ✅ River width: 480px (x=80 to x=560)

**Ready to implement? Y/N**

---

## Frog Movement (Grid-Based Hopping)

### Decision Timer
- **Interval:** 0.5 seconds (500ms)
- **Trigger:** Every 0.5 seconds, each frog makes a movement decision
- **No smooth animation** — movement is discrete (instant jump)

### Movement Mechanics
- **Movement unit:** 1 grid square = 32 pixels
- **Per decision:** Frog makes ONE jump per decision point (or stays still)
- **Jump probability:**
  - 60% chance: Jump (move 1 unit)
  - 40% chance: Wait (stay in place)
- **Grid alignment:** Frogs snap to 32px grid at all times (x, y are multiples of 32)

### Jump Directions
- **Allowed directions:** UP, DOWN, LEFT only
- **Never RIGHT** — frogs always progress toward lily pads on the left
- **Direction selection:** Random choice among UP/DOWN/LEFT (equal probability)
- **Pixel offsets:**
  - UP: gridY -= 1 (visual y -= 32)
  - DOWN: gridY += 1 (visual y += 32)
  - LEFT: gridX -= 1 (visual x -= 32)

### AI Decision Logic
At each 0.5-second decision point:
1. Random choice: Jump (60%) or Wait (40%)
2. If Jump:
   - Random direction from [UP, DOWN, LEFT]
   - Move 1 unit in that direction
   - Check for log collision at new position
   - If on log: Enter ON_LOG state (ride for 1-2 seconds)
   - If in water: Stay SWIMMING (next decision in 0.5s)
3. If Wait:
   - Frog stays in current grid position
   - Next decision in 0.5 seconds

### Visual Representation
- Frogs displayed as 24×24 squares
- Color indicates state:
  - Red (0xff0000): SWIMMING
  - Light red (0xff6666): ON_LOG (riding a log)
- Position: Snapped to grid tiles (grid-aligned)

---

## Lily Pads

### Location
- **Bank:** LEFT side (green left bank)
- **X position:** x = 40 (near left edge)
- **X condition:** x < 100 defines left bank area
- **Grid position:** Frogs moving LEFT and reaching x < 100 can occupy lily pads

### Pad Placement
- **Count:** 5 lily pads
- **Spacing:** Distributed vertically on left bank
- **Visual:** Yellow/gold circles (radius 16px)
- **Positions:**
  - Pad 1: y = 64 + 16 = 80
  - Pad 2: y = 128 + 16 = 144
  - Pad 3: y = 192 + 16 = 208
  - Pad 4: y = 256 + 16 = 272
  - Pad 5: y = 320 + 16 = 336

### Win Condition
- Frogs move LEFT and reach x < 100 (left bank)
- Frog collision with lily pad → pad fills (turns dark red)
- Game loses when all 5 lily pads are filled (frogs reached safety)

---

## Frog Spawn Behavior

### Spawn Parameters
- **Spawn count:** 6-10 frogs maximum (doubled from 3-5)
- **Spawn location:** RIGHT edge of river (x ≈ 560)
- **Spawn interval:** Every 2-3 seconds (random 2000-3000ms)
- **Grid alignment:** Spawned on 32px grid

### Spawn Mechanics
1. Check current frog count vs. random max (6-10)
2. If count < max, spawn new frog
3. Position: Grid-aligned on right side (x = 560, y = random grid row)
4. State: SWIMMING (initial)
5. Decision timer: Starts at 0 (first decision in 0.5s)

### Pressure on Gator
- **More frogs = more threat**
- 6-10 frogs trying to reach left lily pads simultaneously
- Higher spawn rate (every 2-3 seconds) means gator must keep intercepting
- Difficulty increases due to volume (not frog speed or intelligence)
- Gator has 3 HP before losing
