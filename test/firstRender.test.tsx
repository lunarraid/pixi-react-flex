import { Suspense } from 'react';
import { expect, it } from 'vitest';
import { loadYoga } from 'yoga-layout/load';
import { Container } from '../src';
import { createTestRoot, find } from './render';

/*
 * An app's first render, in a module of its own: layout nodes suspend only while yoga is loading. One rendered after
 * it has loaded mounts at once, where `React.lazy` suspended it anyway, and React held the reveal back by its fallback
 * throttle (300 ms).
 */

it('mounts without suspending once yoga has loaded', async () => {
  // The library started loading yoga when it was imported, before this.
  await loadYoga();

  let fallbacks = 0;

  function Fallback () {
    fallbacks++;
    return null;
  }

  const root = createTestRoot();

  await root.render(
    <Suspense fallback={ <Fallback /> }>
      <Container label="box" style={{ width: 10, height: 10 }} />
    </Suspense>
  );

  expect(fallbacks).toBe(0);
  expect(find(root.stage, 'box')).toBeTruthy();
});
