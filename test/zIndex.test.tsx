import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Container as PixiContainer } from 'pixi.js';
// @ts-expect-error @pixi/react's internals, aliased in vitest.config.ts
import { appendChild } from '@pixi/react/lib/helpers/appendChild.mjs';
// @ts-expect-error
import { insertBefore } from '@pixi/react/lib/helpers/insertBefore.mjs';
// @ts-expect-error
import { removeChild } from '@pixi/react/lib/helpers/removeChild.mjs';
import { Container, LayoutView } from '../src';
import { createTestRoot, drawOrder, find, until, xs } from './render';

/*
 * zIndex as in React Native: it orders siblings only, equal zIndexes draw in React order, and layout ignores it.
 */

let root: ReturnType<typeof createTestRoot>;

function Row ({ children }: { children?: ReactNode }) {
  return (
    <Container label="root" style={{ width: 1000, height: 100, flexDirection: 'row' }}>
      { children }
    </Container>
  );
}

function box (label: string, zIndex?: number) {
  return <Container key={ label } label={ label } zIndex={ zIndex } style={{ width: 10, height: 10 }} />;
}

function plain (label: string, zIndex?: number) {
  return <pixiContainer key={ label } label={ label } zIndex={ zIndex } />;
}

async function render (children: ReactNode) {
  await root.render(<Row>{ children }</Row>);
  root.frame();
}

const draw = () => drawOrder(find(root.stage, 'root') as PixiContainer);

/** Siblings sorted by zIndex, ties in React order: what React Native draws. */
function expected (reactOrder: string[], zIndex: Record<string, number>) {
  return [ ...reactOrder ].sort((a, b) => (zIndex[a] ?? 0) - (zIndex[b] ?? 0));
}

beforeEach(async () => {
  root = createTestRoot();
  await root.render(<Row />);
  await until(() => !!root.stage.getChildByLabel('root', true));
});

afterEach(async () => {
  await root.unmount();
  expect(root.errors).toEqual([]);
});

describe('draw order', () => {

  it('draws siblings by zIndex', async () => {
    await render([ box('A', 2), box('B', 1), box('C', 0) ]);
    expect(draw()).toEqual([ 'C', 'B', 'A' ]);
  });

  it('draws equal zIndexes in React order', async () => {
    await render([ box('A'), box('B', 1), box('C') ]);
    expect(draw()).toEqual([ 'A', 'C', 'B' ]);
  });

  it('keeps React order for ties after a child is inserted before a higher sibling', async () => {
    // pixi sorts [A1, B0] to [B0, A1]; @pixi/react then inserts C before A at A's sorted index, after B.
    await render([ box('A', 1), box('B') ]);
    await render([ box('C'), box('A', 1), box('B') ]);
    expect(draw()).toEqual([ 'C', 'B', 'A' ]);
  });

  it('sorts when the first child with a zIndex mounts between others', async () => {
    // Mounting between siblings is `addChildAt`, which pixi doesn't sort for (only `addChild` does).
    await render([ box('A'), box('B') ]);
    await render([ box('A'), box('X', -1), box('B') ]);
    expect(draw()).toEqual([ 'X', 'A', 'B' ]);
  });

  it('re-sorts when a zIndex changes', async () => {
    await render([ box('A'), box('B'), box('C') ]);
    await render([ box('A', 5), box('B'), box('C') ]);
    expect(draw()).toEqual([ 'B', 'C', 'A' ]);
    await render([ box('A'), box('B'), box('C') ]);
    expect(draw()).toEqual([ 'A', 'B', 'C' ]);
  });

  it('treats a zIndex given as undefined as 0', async () => {
    // `zIndex={ value }` with no value sets it to undefined, which doesn't compare as a number.
    await render([ box('A', undefined), box('B', undefined), box('C', undefined) ]);
    await render([ box('A', undefined), box('B', -1), box('C', undefined) ]);
    expect(draw()).toEqual([ 'B', 'A', 'C' ]);

    await render([ box('A', 1), box('B', undefined), box('C', -1) ]);
    expect(draw()).toEqual([ 'C', 'B', 'A' ]);

    await render([ box('A', undefined), box('B', undefined), box('C', -1) ]);
    expect(draw()).toEqual([ 'C', 'A', 'B' ]);
  });

  it('sorts non-layout children with layout ones, ties in React order', async () => {
    await render([ plain('P1'), box('A', 1), plain('P2'), box('B') ]);
    expect(draw()).toEqual([ 'P1', 'P2', 'B', 'A' ]);
  });

  it('does not affect layout', async () => {
    await render([ box('A', 2), box('B', 1), box('C', 0) ]);
    expect(xs(root.stage, [ 'A', 'B', 'C' ])).toEqual([ 0, 10, 20 ]);
  });

});

describe('swapping the keys of the first and last of three children', () => {

  // React keeps C and moves the others to the end: `appendChild` B, then A. pixi moves a child that's already there
  // without marking the sort dirty, so without LayoutView's handling they'd be drawn in that order.
  const zIndexes = [ -1, 0, 1 ];
  const combinations = zIndexes.flatMap((a) => zIndexes.flatMap((b) => zIndexes.map((c) => ({ A: a, B: b, C: c }))));

  it.each(combinations)('draws and lays out in React Native order with zIndex A=$A B=$B C=$C', async (zIndex) => {
    await render([ 'A', 'B', 'C' ].map((label) => box(label, zIndex[label as 'A'])));
    await render([ 'C', 'B', 'A' ].map((label) => box(label, zIndex[label as 'A'])));

    expect(draw()).toEqual(expected([ 'C', 'B', 'A' ], zIndex));
    expect(xs(root.stage, [ 'C', 'B', 'A' ])).toEqual([ 0, 10, 20 ]);
  });

});

describe('LayoutView child order under random @pixi/react operations', () => {

  // What the reconciler does, through @pixi/react's own helpers: insert before the next sibling or append when
  // last, move the same way, remove (which destroys), change a zIndex; a frame (sort) may or may not run in between.
  const LayoutContainer = LayoutView(PixiContainer);

  function trial (seed: number) {
    const random = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };

    const parent = new LayoutContainer();
    const react: PixiContainer[] = [];
    let id = 0;

    const create = () => new PixiContainer({ label: `c${ id++ }`, zIndex: random(3) - 1 });
    const place = (child: PixiContainer, index: number) => {
      const before = react[index + 1];
      before ? insertBefore(parent, child, before) : appendChild(parent, child);
    };
    const check = () => {
      parent.sortChildren();
      const want = expected(react.map((c) => c.label), Object.fromEntries(react.map((c) => [ c.label, c.zIndex ])));
      expect(drawOrder(parent)).toEqual(want);
    };

    for (let step = 0; step < 30; step++) {
      const op = random(10);

      if (op < 4 || react.length < 2) {
        const child = create();
        const index = random(react.length + 1);
        react.splice(index, 0, child);
        place(child, index);
      } else if (op < 6) {
        const [ child ] = react.splice(random(react.length), 1);
        const index = random(react.length + 1);
        react.splice(index, 0, child);
        place(child, index);
      } else if (op < 8) {
        const [ child ] = react.splice(random(react.length), 1);
        removeChild(parent, child);
      } else {
        react[random(react.length)].zIndex = random(3) - 1;
      }

      if (random(2)) {
        check();
      }
    }

    check();
  }

  it.each([ 1, 7, 42, 99, 1234 ])('draws in React Native order after every frame (seed %i)', (seed) => {
    for (let i = 0; i < 400; i++) {
      trial(seed * 1000 + i);
    }
  });

});
