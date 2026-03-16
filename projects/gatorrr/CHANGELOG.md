# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-16

### Added
- Initial project structure with Phaser 3.90.0 engine
- Multi-scene architecture (main game vs config)
- Grid-based movement system for gator character
- 12+ row river configuration with moving platforms
- Moving platform system (logs and turtles) with alternating directions
- Collision detection system (platform riding, hazard detection)
- Lives system with 3 lives and respawn mechanics
- Score tracking system with row bonuses and time bonuses
- 60-second countdown timer
- Level progression system
- Game over and level complete screens
- Asset integration framework for sprites and visual design
- Lily pad positioning system (knockouts on left edge)
- Increased frog spawn rate (+25%)
- HUD (Heads-Up Display) showing HP, Frogs eaten, and Pads filled

### Changed
- Updated lily pad positioning to knockouts on the left edge for strategic gameplay
- Increased frog spawn rate from every 2-3 seconds to 1.5-2.25 seconds (+25%)
- Enhanced game mechanics with improved collision detection and platform riding
- Refined visual design with asset integration framework

### Fixed
- Platform wrapping logic for seamless scrolling
- Gator movement constraints within play area
- Collision detection between gator and platforms/hazards
- Game state management during level progression

### Removed
- Placeholder visuals (colored shapes) in favor of sprite assets
- Old lily pad positioning (center-left) in favor of new knockout positioning

### Security
- No security changes in this version

[0.1.0]: https://github.com/TokenGators/MainFrame/compare/v0.0.0...v0.1.0