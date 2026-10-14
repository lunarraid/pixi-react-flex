const float = new Float32Array(1);
const floatBits = new Uint32Array(float.buffer);

/** The smallest 32-bit float no less than `value`, which is not negative. */
function float32AtLeast (value: number): number {
  float[0] = value;

  if (float[0] < value) {
    floatBits[0]++;
  }

  return float[0];
}

/**
 * The width a text's layout node is given for the width it measured, such that yoga keeps it no narrower. Yoga stores
 * layout in 32-bit floats, and rounds it to its pixel grid unless `pointScaleFactor` is 0, and either can leave a
 * line's box a hair narrower than the line: wrapped to its box, as a text is, the line's last word went to a line of
 * its own. Yoga ceils a text node's width itself, but its JavaScript build can't make one.
 *
 * Never more than `availableWidth` (when it's finite) for that, unless the text measured wider than it anyway.
 */
export default function keptTextWidth (width: number, availableWidth: number, pointScaleFactor: number): number {
  // Up to the grid without yoga's tolerance of a ten-thousandth of a pixel: pixi wraps a line any wider than its box.
  const kept = float32AtLeast(pointScaleFactor > 0 ? Math.ceil(width * pointScaleFactor) / pointScaleFactor : width);

  return Number.isFinite(availableWidth) && kept > availableWidth ? Math.max(width, availableWidth) : kept;
}
