import { Fragment, Suspense, useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Container } from '../src';
import { createTestRoot, find, layoutBox, settle, until, xs } from './render';

/*
 * Layout order follows React's order of children, whatever pixi does with its display list: pixi sorts `children` by
 * zIndex in place, and @pixi/react places children by their index in that array, so layout can't be read from it.
 * Each view here is 10 wide in a row, so a view's x is ten times its place in the layout.
 */

let root: ReturnType<typeof createTestRoot>;

function Row ({ children }: { children?: ReactNode }) {
  return (
    <Container label="root" style={{ width: 1000, height: 100, flexDirection: 'row' }}>
      { children }
    </Container>
  );
}

function Box ({ label, zIndex, children }: { label: string, zIndex?: number, children?: ReactNode }) {
  return (
    <Container label={ label } zIndex={ zIndex } style={{ width: 10, height: 10, flexDirection: 'row' }}>
      { children }
    </Container>
  );
}

/** A pixi child with no layout node. */
function Plain ({ label, zIndex, children }: { label: string, zIndex?: number, children?: ReactNode }) {
  return <pixiContainer label={ label } zIndex={ zIndex }>{ children }</pixiContainer>;
}

async function render (children: ReactNode) {
  await root.render(<Row>{ children }</Row>);
  root.frame();
}

/** Asserts `labels` were laid out in that order, one after another. */
function expectRow (labels: string[]) {
  expect(xs(root.stage, labels)).toEqual(labels.map((_, i) => i * 10));
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

describe('layout order is React order, not zIndex order', () => {

  it('lays out children in React order when their zIndex order is reversed', async () => {
    await render([ <Box key="a" label="A" zIndex={ 3 } />, <Box key="b" label="B" zIndex={ 2 } />, <Box key="c" label="C" zIndex={ 1 } /> ]);
    expectRow([ 'A', 'B', 'C' ]);
  });

  it('follows a keyed reorder', async () => {
    await render([ <Box key="a" label="A" zIndex={ 3 } />, <Box key="b" label="B" zIndex={ 2 } />, <Box key="c" label="C" zIndex={ 1 } /> ]);
    await render([ <Box key="c" label="C" zIndex={ 1 } />, <Box key="a" label="A" zIndex={ 3 } />, <Box key="b" label="B" zIndex={ 2 } /> ]);
    expectRow([ 'C', 'A', 'B' ]);
  });

  it('inserts a child in the middle', async () => {
    await render([ <Box key="a" label="A" />, <Box key="b" label="B" /> ]);
    await render([ <Box key="a" label="A" />, <Box key="d" label="D" zIndex={ 50 } />, <Box key="b" label="B" /> ]);
    expectRow([ 'A', 'D', 'B' ]);
  });

  it('removes a child from the middle', async () => {
    await render([ <Box key="a" label="A" />, <Box key="d" label="D" />, <Box key="b" label="B" /> ]);
    await render([ <Box key="a" label="A" />, <Box key="b" label="B" /> ]);
    expectRow([ 'A', 'B' ]);
  });

  it('does not move children when only their zIndex changes', async () => {
    await render([ <Box key="a" label="A" />, <Box key="b" label="B" />, <Box key="c" label="C" /> ]);
    await render([ <Box key="a" label="A" zIndex={ 99 } />, <Box key="b" label="B" zIndex={ -5 } />, <Box key="c" label="C" /> ]);
    expectRow([ 'A', 'B', 'C' ]);
  });

  it('fills a conditional gap in place', async () => {
    await render([ <Box key="a" label="A" />, false, <Box key="b" label="B" /> ]);
    expectRow([ 'A', 'B' ]);
    await render([ <Box key="a" label="A" />, <Box key="x" label="X" zIndex={ -1 } />, <Box key="b" label="B" /> ]);
    expectRow([ 'A', 'X', 'B' ]);
  });

  it('orders nested children by React order', async () => {
    await render(
      <Box label="P">
        <Box key="q" label="Q" zIndex={ 3 } />
        <Box key="r" label="R" zIndex={ 2 } />
        <Box key="s" label="S" zIndex={ 1 } />
      </Box>
    );
    expectRow([ 'Q', 'R', 'S' ]);

    await render(
      <Box label="P">
        <Box key="s" label="S" zIndex={ 1 } />
        <Box key="q" label="Q" zIndex={ 3 } />
        <Box key="r" label="R" zIndex={ 2 } />
      </Box>
    );
    expectRow([ 'S', 'Q', 'R' ]);
  });

});

describe('non-layout children', () => {

  it('are skipped by layout when interleaved with layout children', async () => {
    await render([
      <Plain key="p1" label="P1" zIndex={ 9 } />,
      <Box key="a" label="A" />,
      <Plain key="p2" label="P2" zIndex={ -9 } />,
      <Box key="b" label="B" zIndex={ 4 } />,
      <Box key="c" label="C" />
    ]);
    expectRow([ 'A', 'B', 'C' ]);
  });

  it('do not disturb inserting and reordering layout children around them', async () => {
    await render([ <Plain key="p1" label="P1" zIndex={ 9 } />, <Box key="a" label="A" />, <Box key="b" label="B" /> ]);
    await render([
      <Plain key="p1" label="P1" zIndex={ 9 } />,
      <Box key="a" label="A" />,
      <Plain key="p3" label="P3" zIndex={ 5 } />,
      <Box key="n" label="N" zIndex={ -3 } />,
      <Box key="b" label="B" />
    ]);
    expectRow([ 'A', 'N', 'B' ]);

    await render([
      <Box key="b" label="B" />,
      <Plain key="p3" label="P3" zIndex={ 5 } />,
      <Box key="n" label="N" zIndex={ -3 } />,
      <Plain key="p1" label="P1" zIndex={ 9 } />,
      <Box key="a" label="A" />
    ]);
    expectRow([ 'B', 'N', 'A' ]);
  });

  it('are skipped inside a layout container', async () => {
    await render(
      <Box label="P">
        <Plain label="p1" zIndex={ 3 } />
        <Box label="P1" zIndex={ 2 } />
        <Plain label="p2" />
        <Box label="P2" zIndex={ 1 } />
      </Box>
    );
    expectRow([ 'P1', 'P2' ]);
  });

});

describe('children changing without their parent re-rendering', () => {

  it('lays out a child that remounts under a parent that does not re-render', async () => {
    let remount = () => {};

    function Remounter () {
      const [ key, setKey ] = useState(0);
      remount = () => setKey((k) => k + 1);
      return <Box key={ key } label="M" />;
    }

    await render([ <Box key="a" label="A" zIndex={ 5 } />, <Remounter key="m" />, <Box key="b" label="B" zIndex={ -5 } /> ]);
    expectRow([ 'A', 'M', 'B' ]);

    const before = find(root.stage, 'M');
    // Only the remounter re-renders: nothing lays out the tree until the next frame's prerender.
    remount();
    await settle();
    root.frame();
    expect(find(root.stage, 'M')).not.toBe(before);
    expectRow([ 'A', 'M', 'B' ]);
  });

  it('takes a suspended child out of layout and puts it back in place', async () => {
    let suspended: Promise<void> | null = null;
    let resume = () => {};

    function MaybeSuspend () {
      if (suspended) {
        throw suspended;
      }

      return <Box label="S" />;
    }

    // New elements each time: React skips re-rendering an element it has already rendered.
    const children = () => [
      <Box key="a" label="A" />,
      <Suspense key="s" fallback={ null }><MaybeSuspend /></Suspense>,
      <Box key="b" label="B" />
    ];

    await render(children());
    expectRow([ 'A', 'S', 'B' ]);

    suspended = new Promise<void>((resolve) => { resume = () => { suspended = null; resolve(); }; });
    await render(children());
    expectRow([ 'A', 'B' ]);

    resume();
    await until(() => find(root.stage, 'S').visible);
    await new Promise((resolve) => setTimeout(resolve, 50));
    root.frame();
    expectRow([ 'A', 'S', 'B' ]);
  });

  it('unmounts a subtree while its children are waiting to be reindexed', async () => {
    await render(<Box label="P"><Box key="q" label="Q" /><Box key="r" label="R" /></Box>);
    await render(<Box label="P"><Box key="r" label="R" /><Box key="q" label="Q" /></Box>);
    await render([ <Box key="a" label="A" /> ]);
    expectRow([ 'A' ]);
  });

});

describe('children sharing one React position', () => {

  // A Fragment's children, or several from one component, all get the Fragment's or component's index, so they're
  // ordered by where their views were placed.

  function List ({ labels, zIndex = {} }: { labels: string[], zIndex?: Record<string, number> }) {
    return labels.map((label) => <Box key={ label } label={ label } zIndex={ zIndex[label] } />);
  }

  it('follows a reorder inside a Fragment', async () => {
    await render(<Fragment><Box key="1" label="F1" /><Box key="2" label="F2" /><Box key="3" label="F3" /></Fragment>);
    await render(<Fragment><Box key="3" label="F3" /><Box key="1" label="F1" /><Box key="2" label="F2" /></Fragment>);
    expectRow([ 'F3', 'F1', 'F2' ]);
  });

  it('follows a move before a sibling that stays in place inside a Fragment', async () => {
    // React moves F1 with insertBefore(F3) rather than appending it.
    await render(<Fragment><Box key="1" label="F1" /><Box key="2" label="F2" /><Box key="3" label="F3" /></Fragment>);
    await render(<Fragment><Box key="2" label="F2" /><Box key="1" label="F1" /><Box key="3" label="F3" /></Fragment>);
    expectRow([ 'F2', 'F1', 'F3' ]);
  });

  it('places a child inserted in the middle of a Fragment', async () => {
    await render(<Fragment><Box key="1" label="F1" /><Box key="3" label="F3" /></Fragment>);
    await render(<Fragment><Box key="1" label="F1" /><Box key="2" label="F2" /><Box key="3" label="F3" /></Fragment>);
    expectRow([ 'F1', 'F2', 'F3' ]);
  });

  it('keeps a Fragment in place among its siblings', async () => {
    await render([ <Box key="a" label="A" />, <Fragment key="f"><Box key="1" label="F1" /></Fragment>, <Box key="b" label="B" /> ]);
    await render([ <Box key="a" label="A" />, <Fragment key="f"><Box key="2" label="F2" /><Box key="1" label="F1" /></Fragment>, <Box key="b" label="B" /> ]);
    expectRow([ 'A', 'F2', 'F1', 'B' ]);
  });

  it('orders nested Fragments', async () => {
    await render(<Fragment><Box key="1" label="F1" /><Fragment key="g"><Box key="2" label="F2" /><Box key="3" label="F3" /></Fragment></Fragment>);
    await render(<Fragment><Fragment key="g"><Box key="3" label="F3" /><Box key="2" label="F2" /></Fragment><Box key="1" label="F1" /></Fragment>);
    expectRow([ 'F3', 'F2', 'F1' ]);
  });

  it('follows reorders, inserts and removals of children from one component', async () => {
    await render(<List labels={ [ 'L1', 'L2', 'L3' ] } />);
    await render(<List labels={ [ 'L3', 'L1', 'L2' ] } />);
    expectRow([ 'L3', 'L1', 'L2' ]);

    await render(<List labels={ [ 'L3', 'L4', 'L1', 'L2' ] } />);
    expectRow([ 'L3', 'L4', 'L1', 'L2' ]);

    await render(<List labels={ [ 'L3', 'L2' ] } />);
    expectRow([ 'L3', 'L2' ]);
  });

  it('orders them by React order, not zIndex order', async () => {
    const zIndex = { L1: 3, L2: 2, L3: 1 };
    await render(<List labels={ [ 'L1', 'L2', 'L3' ] } zIndex={ zIndex } />);
    expectRow([ 'L1', 'L2', 'L3' ]);

    await render(<List labels={ [ 'L2', 'L4', 'L3', 'L1' ] } zIndex={ zIndex } />);
    expectRow([ 'L2', 'L4', 'L3', 'L1' ]);
  });

});

/*
 * A plain pixi container isn't laid out, so neither is what's placed in it: each layout view in one is a layout root
 * of its own, sized by its own style at its own origin, and takes no part in the layout around the container.
 */
describe('layout children inside a plain pixi container', () => {

  function Wrapped ({ children }: { children: ReactNode }) {
    return <Plain label="W">{ children }</Plain>;
  }

  it('take no space in the layout around it', async () => {
    await render([ <Box key="a" label="A" />, <Plain key="w" label="W"><Box key="1" label="W1" /><Box key="2" label="W2" /></Plain>, <Box key="b" label="B" /> ]);
    expectRow([ 'A', 'B' ]);
  });

  it('are each laid out on their own', async () => {
    await render(<Plain label="W"><Box key="1" label="W1" /><Box key="2" label="W2" /></Plain>);
    expect(xs(root.stage, [ 'W1', 'W2' ])).toEqual([ 0, 0 ]);
    expect(layoutBox(root.stage, 'W1').width).toBe(10);
  });

  it('lay out their own children', async () => {
    await render(<Plain label="W"><Box label="P"><Box key="q" label="Q" /><Box key="r" label="R" /></Box></Plain>);
    expectRow([ 'Q', 'R' ]);

    await render(<Plain label="W"><Box label="P"><Box key="r" label="R" /><Box key="q" label="Q" /></Box></Plain>);
    expectRow([ 'R', 'Q' ]);
  });

  it('are found inside a component', async () => {
    await render([ <Box key="a" label="A" />, <Wrapped key="w"><Box label="W1" /></Wrapped>, <Box key="b" label="B" /> ]);
    expectRow([ 'A', 'B' ]);
    expect(xs(root.stage, [ 'W1' ])).toEqual([ 0 ]);
  });

  it('are laid out when they mount later, and removed cleanly', async () => {
    await render([ <Box key="a" label="A" />, <Plain key="w" label="W" /> ]);
    await render([ <Box key="a" label="A" />, <Plain key="w" label="W"><Box label="W1" /></Plain> ]);
    expect(layoutBox(root.stage, 'W1').width).toBe(10);

    await render([ <Box key="a" label="A" />, <Plain key="w" label="W" /> ]);
    expectRow([ 'A' ]);
  });

});
