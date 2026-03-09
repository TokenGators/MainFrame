# 🐊 GATORRR - Product Requirements Document v2.0

**Game Title:** TokenGators Gator Frogger ("GATORRR")  
**Platform:** Web (Phaser.js)  
**Genre:** Tower Defense + Frogger Hybrid  
**Status:** MVP Ready for Enhancement  
**Target Release:** End of Phase 2 (v2.0 with assets)

---

## 1. Game Overview (Updated)

**Core Concept:** 
You are a gator defending your home lily pad from an invasion of frogs. The frogs hop across logs floating in the river trying to reach your side. Your job: **eat the frogs before they overwhelm your lily pads**.

**Win Condition:** Eat 10 frogs  
**Lose Conditions:**
- All 3 HP depleted (hit by logs)
- All 5 lily pads filled by frogs

---

## 2. Game World & Visuals (UPDATED - ASSET INTEGRATED)

### Screen Layout
```
LEFT BANK (PLAYER):          RIVER:               RIGHT BANK (ENEMY):
Lily Pad Home Zone     Moving Logs (12 columns)    Frog Spawn Zone

🌿🌿🌿              🪵        🪵        🪵           🐸🐸🐸
[Pads]           ═══════════════════════════
Gator 🐊        ─────────────────────────────    Frogs
                🪵        🪵        🪵              spawn
                ═════════════════════════════     here
                ─────────────────────────────
                🪵        🪵        🪵
```

### Visual Style - Phase 1 & 2

**Phase 1 (Current - Colored Shapes):**
- Simple rectangles/circles for all entities
- Functional, playable, no art

**Phase 2 (NEW - Asset Integration):**
- **Frog:** Replace red squares with **actual frog sprite**
  - Source: Design reference from Space-N-Gators project
  - Size: 32×32 px (matches grid)
  - States: Swimming, On Log, Vulnerable (color overlay)
  
- **Gator:** Use TokenGators gator sprite
  - Source: `/spacengators/public/enemy-gator-reference.png`
  - Scale to 32×32 px
  - Green tint, player-controlled entity
  
- **Logs:** Brown cylindrical logs
  - Drawn as rounded rectangles or pixel art
  - 80px wide × 20px tall
  - Direction indicator (shading)
  
- **Lily Pads:** Green lily pad shapes with "knockout" positioning (see Section 3)
  - 32×32 px
  - Occupied/empty visual states
  
- **Water:** Blue background with ripple/wave texture
  - Gives depth to river environment

---

## 3. Lily Pads (CRITICAL UPDATE - NEW POSITIONING)

### Location & Layout (CHANGED)
Lily pads are now positioned in **"knockouts"** along the **LEFT EDGE** of the water zone, creating safe landing spots directly adjacent to the rightmost logs.

**New Position Structure:**
```
Safe Zone (Bank)   |  Knockouts (Lily Pads in Water)  |  River (Logs)
                   |  🌿 [Pad 5]                       |
                   |                                   |  🪵 Log Top
                   |  🌿 [Pad 4]                       |
                   |                                   |  🪵 Log
Gator Start → 🐊   |  🌿 [Pad 3]                       |
                   |                                   |  🪵 Log
                   |  🌿 [Pad 2]                       |
                   |                                   |  🪵 Log
                   |  🌿 [Pad 1]                       |
```

### Gameplay Implication
- **Frogs can now hop from leftmost log → lily pad knockout → home**
- **Gator has clear attack line:** Can move to lily pads and eat frogs mid-jump
- **Strategic positioning:** Gator can defend pads or intercept frogs on logs
- **New vulnerability window:** Frogs in knockouts are exposed before reaching the bank

### Technical Implementation
- **Lily Pad Grid Positions:** (x=48, rows 8-12 with 32px spacing)
  - Positioned 1 tile to the LEFT of the water's left edge
  - Frogs must jump to these positions to "reach home"
  - Each pad is a valid landing zone with collision detection
  
- **Gator Movement:** Can move to lily pad row (rows 8-12)
  - Gator can intercept frogs jumping to pads
  - Adds strategic depth: defend early or hunt in water?

---

## 4. Frogs - Spawning Update (INCREASED BY 25%)

### Spawn Rate Changes
**Previous Rate:** Every 2-3 seconds (randomized)  
**New Rate (25% Increase):** Every 1.5-2.25 seconds (randomized)

### Spawn Behavior
- Spawn on **RIGHT BANK** (right edge, x=760)
- **Frequency:** 1.5-2.25 second intervals (25% more frogs)
- **Max active:** 5-6 frogs at once (increased from 5)
- **Counter display:** "Frogs: X/10" (HUD)

### Why 25% More?
- Creates urgency and chaos
- Frogs fill lily pads faster (requires more aggressive play)
- Gator must be more strategic (hunt or defend)
- Difficulty scaling without needing log speed increase

---

## 5. Frog AI & Behavior (From Phase 2 - Unchanged)

### Frog State Machine
```
SWIMMING → [detect log] → ON_LOG → [ride 1-2s] → SWIMMING
   ↓                                                   ↓
[wait > 2s in water] → VULNERABLE → [gator eats] → DESPAWN
                              ↓
                      [log arrives] → ON_LOG
```

### Movement
- **Base Speed:** 20-36 px/sec (constant)
- **Direction:** Always moving LEFT toward lily pads
- **Smart AI:** Detect logs within 100px, jump onto them, ride vertically
- **Riding:** Move with log vertically while continuing left
- **Wait State:** If waiting > 2 sec without log, flash (VULNERABLE)

### Frogs Reaching Lily Pads
- Detect lily pad collision at left edge
- Occupy pad (if empty)
- Increment "Pads Filled" counter
- Despawn
- **If all 5 pads filled before gator eats 10 frogs → LOSE**

---

## 6. Gator (Player) - Mechanics

### Controls
- **Arrow Keys:** ↑ ↓ ← →
- **Movement:** 32px per keypress (grid-based)
- **Bounds:** Confined to play area (no wrapping)

### Health System
- **HP:** 3 (start with 3/3)
- **Damage:** -1 HP per log collision
- **Cooldown:** 0.5s between damage hits (prevent spam)
- **Death:** HP = 0 → Game Over (lose condition)

### Eating Frogs
- **Collision:** Gator + Frog = Eat frog
- **Effect:** +1 to "Frogs Eaten" counter
- **Frog despawns:** Removed from play
- **Win condition:** Eat 10 frogs

### Visuals
- **Sprite:** TokenGators gator (32×32 px)
- **State:** Normal (green), damaged (flash red on hit)
- **Position:** Can move to any grid square (including lily pad rows for interception)

---

## 7. Logs (Obstacles)

### Structure & Movement
- **Count:** 12 columns (vertical lanes across river)
- **Direction:** Alternating UP/DOWN per column (Column 1 UP, 2 DOWN, 3 UP, etc.)
- **Speed:** Variable per log (80-150 px/sec)
- **Pattern:** 2-3 logs per column, spaced for safe navigation

### Safe Passage Guarantee
- Always at least one safe path through logs for gator
- Logs never completely block all horizontal passage
- Creates challenging but fair navigation

### Collision with Gator
- Rectangle-based collision detection
- Gator touching log = -1 HP (with 0.5s cooldown)
- Gator stays in place (doesn't reset position)

---

## 8. HUD (Heads-Up Display)

### Layout (Top of screen)
```
HP: 3/3  |  Frogs: 0/10  |  Pads: 0/5
```

### Elements
- **HP:** Current/Max (White, Red if 1 HP remaining)
- **Frogs Eaten:** Current/Target (White)
- **Lily Pads Filled:** Current/Max (White, Red if 4+ filled)

---

## 9. Game States & Flow

### PLAYING
- All entities moving/spawning
- Collision detection active
- HUD updates in real-time

### LEVELUP / WAVE COMPLETE (Future)
- After eating 10 frogs, show victory screen
- Option: Play again

### GAME OVER - Lost All HP
```
GAME OVER
Lost all HP

Frogs Eaten: X/10
Press R to Restart
```

### GAME OVER - Pads Full
```
GAME OVER
All lily pads filled!

Frogs Eaten: X/10
Press R to Restart
```

### WIN - 10 Frogs Eaten
```
YOU WIN! 🐊
Ate 10 Frogs!

Time: XXs
Press R to Play Again
```

---

## 10. Asset Requirements & Integration

### Phase 2 Assets (NEW)

**1. Frog Sprite**
- Current: Red squares (placeholder)
- Phase 2: Actual frog pixel art sprite
- Size: 32×32 px
- Source: Design reference / create new
- States:
  - Swimming (normal red/orange)
  - On Log (lighter shade)
  - Vulnerable (dark red, flashing)

**2. Gator Sprite**
- Current: Green rectangle (placeholder)
- Phase 2: TokenGators gator sprite
- Size: 32×32 px
- Scale from: `/spacengators/public/enemy-gator-reference.png`
- Color: Green (player-controlled)

**3. Log Sprites**
- Current: Brown rectangles (placeholder)
- Phase 2: Pixel art logs (cylindrical, brown)
- Size: 80×20 px
- Direction shading (darker = up, lighter = down)

**4. Lily Pad Sprites**
- Current: Green rectangles (placeholder)
- Phase 2: Lily pad artwork (leaf shape, green)
- Size: 32×32 px
- States: Empty (green), Filled (green + frog silhouette)

**5. Water Texture**
- Current: Blue background
- Phase 2: Blue with wave/ripple pattern
- Optional: Animated ripples

**6. Background**
- Bank areas (grass/dirt texture)
- Forest scenery (trees, flowers, rocks)
- Depth layers for visual polish

### File Organization
```
/games/frogger/
├── src/
│   ├── main.js
│   ├── config.js
│   └── scenes/
├── public/                ← devServer root
│   └── assets/            ← Sprite directory
│       ├── frog.png
│       ├── gator.png
│       ├── lily_pad.png
│       ├── audio/         ← For Phase 3
│       │   ├── hop.wav
│       │   ├── eat.wav
│       │   ├── die.wav
│       │   └── music.ogg
│       └── fonts/         ← For Phase 3
├── dist/                  (built output)
└── webpack.config.js
```

---

## 11. Development Phases

### Phase 1 (COMPLETE ✅)
**Status:** MVP playable with placeholder visuals

- ✅ Gator movement (grid-based, 4 directions)
- ✅ Log spawning & movement (12 columns, alternating directions)
- ✅ Frog spawning & smart AI (log detection, riding, vulnerability)
- ✅ Collision detection (all types)
- ✅ HUD (HP, Frogs, Pads)
- ✅ Win/Lose conditions
- ✅ Restart (R key)
- ✅ Playable in browser
- 🟢 Placeholder visuals (colored shapes)

### Phase 2 (CURRENT - v2.0) 🎯
**Status:** Ready to begin  
**Focus:** Asset integration + small tweaks

**Tasks:**
1. ✏️ **Create assets folder** and organize sprite files
2. ✏️ **Load frog sprite** (replace red squares with pixel art)
3. ✏️ **Load gator sprite** (from Space-N-Gators reference)
4. ✏️ **Load log sprites** (brown pixel art cylinders)
5. ✏️ **Update lily pad positioning** (move to knockouts on left edge)
6. ✏️ **Implement lily pad collision** (new left-edge positions)
7. ✏️ **Adjust frog spawn rate** (+25% = every 1.5-2.25 sec)
8. ✏️ **Test all changes** (visuals, gameplay, collisions)
9. ✏️ **Build & run locally** (npm run build + serve)

**Deliverable:** Fully visual game (v2.0) with enhanced spawn rate

### Phase 3 (FUTURE)
- Audio (hop, eat, die, music)
- Animations (hopping, idle, death)
- Difficulty scaling (levels, speed increases)
- Leaderboard (local storage)
- Mobile touch controls
- Visual effects (splash, particles)
- Background art

---

## 12. Testing Checklist (Phase 2)

### Visuals
- [ ] Frog sprite renders correctly (32×32 px)
- [ ] Gator sprite renders correctly (32×32 px)
- [ ] Log sprites visible and moving
- [ ] Lily pads display in left-edge knockouts
- [ ] Water background visible
- [ ] No missing assets or console errors

### Gameplay - Lily Pads (NEW)
- [ ] Lily pads positioned on left edge (not center-left)
- [ ] Frogs can reach lily pad knockouts
- [ ] Gator can move to lily pad rows
- [ ] Gator can intercept frogs on pads
- [ ] Pad occupation logic works (1 frog per pad)

### Gameplay - Spawn Rate (UPDATED)
- [ ] Frogs spawn every 1.5-2.25 sec (not 2-3 sec)
- [ ] Max 5-6 frogs active at once
- [ ] Frogs spawn more frequently (25% increase)
- [ ] Game feels more challenging

### Core Mechanics (Should Not Break)
- [ ] Gator movement (4 directions, grid-based)
- [ ] Log collisions still damage gator
- [ ] Gator can eat frogs
- [ ] Frogs reach pads, increment counter
- [ ] Win/lose conditions work
- [ ] HUD updates correctly
- [ ] Restart works (R key)

### Performance
- [ ] 60 FPS on standard devices
- [ ] No lag with 5-6 active frogs
- [ ] Smooth sprite rendering
- [ ] No memory leaks

---

## 13. Success Criteria (Phase 2 v2.0)

**Game is "ready" when:**
- ✅ All Phase 2 assets loaded and rendering
- ✅ Lily pads repositioned to left-edge knockouts
- ✅ Frog spawn rate increased 25%
- ✅ All Phase 1 mechanics still working
- ✅ Game plays smoothly (60 FPS)
- ✅ Tested end-to-end (win/lose scenarios)
- ✅ Built & deployed locally
- ✅ No console errors

---

## 14. Technical Notes

### Phaser.js Sprite Loading
```javascript
// In create():
this.load.image('frog', 'public/assets/sprites/frog.png');
this.load.image('gator', 'public/assets/sprites/gator.png');
this.load.image('log', 'public/assets/sprites/log.png');
this.load.image('lily_pad', 'public/assets/sprites/lily_pad.png');

// Then display:
const frog = this.add.sprite(x, y, 'frog');
frog.setDisplaySize(32, 32);
```

### Lily Pad Positioning (Left-Edge Knockouts)
- Lily pads spawn at x=48 (just left of water's left edge at x=80)
- Rows: 8, 9, 10, 11, 12 (same as log rows)
- Frogs navigate to x≤48 to occupy pads
- Gator can move to these positions for interception

### Frog Spawn Rate Adjustment
```javascript
// Current: Phaser.Math.Between(2000, 3000) ms
// New: Phaser.Math.Between(1500, 2250) ms  ← 25% increase
const spawnDelay = Phaser.Math.Between(1500, 2250);
```

---

## 15. Known Issues & Limitations (Phase 1)

- Placeholder visuals (colored shapes) - **Addressed in Phase 2**
- Lily pads positioned center-left (not optimal for gameplay) - **Fixed in Phase 2**
- Frog spawn rate too slow (easy to manage) - **Increased in Phase 2**
- No audio/sound effects - **Phase 3**
- No animations - **Phase 3**

---

## 16. Team & Timeline

**Team:**
- **Murphy:** Lead developer (game architecture, asset integration)
- **Kthings:** Product owner (review & approval)
- **Assets:** Reference sprites from Space-N-Gators, design team

**Timeline:**
- **Phase 2 Estimate:** 8-12 hours (asset loading + lily pad repositioning + spawn adjustment)
- **Target Completion:** Within week

---

## 17. Sign-Off

**Status:** ✏️ **READY FOR REVIEW**

Before Phase 2 development begins:
- [ ] Kthings reviews and approves PRD
- [ ] Confirm asset sources (frog sprite, gator sprite)
- [ ] Confirm lily pad knockout positions are acceptable
- [ ] Confirm 25% spawn rate increase is desired difficulty

**Once approved:** Development begins immediately on asset integration.

---

**Document Version:** 2.0  
**Last Updated:** 2026-03-08  
**Author:** Murphy 🔧  
**Status:** Pending Review
