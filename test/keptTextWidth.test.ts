import { describe, expect, it } from 'vitest';
import keptTextWidth from '../src/helpers/keptTextWidth';

/*
 * The width a text's layout node is given: what yoga keeps must be no narrower than the line, or the line wraps.
 */

describe('a text width kept by yoga', () => {

  // A bitmap line's measured width, which a 32-bit float rounds down to 366.2518615722656.
  const line = 366.2518744468689;

  it('is no narrower than the line once stored in a 32-bit float', () => {
    const kept = keptTextWidth(line, NaN, 0);
    expect(Math.fround(kept)).toBe(kept);
    expect(kept).toBeGreaterThanOrEqual(line);
  });

  it('is the line itself when a 32-bit float holds it', () => {
    expect(keptTextWidth(120.5, NaN, 0)).toBe(120.5);
  });

  it('is rounded up to the pixel grid', () => {
    expect(keptTextWidth(line, NaN, 1)).toBe(367);
    expect(keptTextWidth(line, NaN, 2)).toBe(366.5);
    expect(keptTextWidth(366, NaN, 1)).toBe(366);
  });

  it('is rounded up even for a hair over the grid', () => {
    expect(keptTextWidth(366.00005, NaN, 1)).toBe(367);
  });

  it('is not rounded past the width available', () => {
    expect(keptTextWidth(366.4, 366.5, 1)).toBe(366.5);
  });

  it('is still as wide as a line wider than the width available', () => {
    expect(keptTextWidth(400.25, 300, 1)).toBe(400.25);
  });

});
