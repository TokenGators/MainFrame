/**
 * bitmapText — thin wrapper around Phaser's add.bitmapText()
 *
 * Usage:
 *   import bt from '../ui/bitmapText.js';
 *   bt(scene, x, y, 'HELLO', 8, 0xFFA300).setOrigin(0.5);
 *
 * @param {Phaser.Scene} scene
 * @param {number}       x
 * @param {number}       y
 * @param {string}       text
 * @param {number}       size   - font size in canvas px (8 = native, 16 = 2×, etc.)
 * @param {number}       color  - 0xRRGGBB hex tint (default white)
 * @returns {Phaser.GameObjects.BitmapText}
 */
export default function bt(scene, x, y, text, size = 8, color = 0xFFF1E8) {
  return scene.add.bitmapText(x, y, 'ps2p', text, size).setTint(color);
}

// Palette constants re-exported for convenience
export const C_WHITE   = 0xFFF1E8;
export const C_ORANGE  = 0xFFA300;
export const C_YELLOW  = 0xFFEC27;
export const C_GREEN   = 0x00E436;
export const C_GRAY    = 0xC2C3C7;
export const C_DIM     = 0x5F574F;
export const C_RED     = 0xFF004D;
