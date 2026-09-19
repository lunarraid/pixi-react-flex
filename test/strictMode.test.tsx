import { Fragment, StrictMode, createRef, type ReactNode, type RefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Container, LayoutNode, type ContainerRef } from '../src';
import { createTestRoot, until, xs } from './render';

/*
 * StrictMode (in development) disconnects a component's effects and runs them again without remounting it, as
 * <Activity> does (which @pixi/react's reconciler doesn't support yet). A layout node's yoga node is freed on the way
 * out, so it must be recreated, restyled and put back in the tree, or it's used after being freed: layout can look
 * right while that memory hasn't been reused, so the nodes are checked directly too.
 */

let root: ReturnType<typeof createTestRoot>;
let refs: Record<string, RefObject<ContainerRef | null>>;

const ref = (label: string) => (refs[label] ??= createRef<ContainerRef>());

function Row ({ children }: { children?: ReactNode }) {
  return (
    <Container label="root" ref={ ref('root') } style={{ width: 1000, height: 100, flexDirection: 'row' }}>
      { children }
    </Container>
  );
}

function box (label: string, zIndex?: number, children?: ReactNode) {
  return (
    <Container key={ label } label={ label } ref={ ref(label) } zIndex={ zIndex } style={{ width: 10, height: 10, flexDirection: 'row' }}>
      { children }
    </Container>
  );
}

async function render (children: ReactNode) {
  await root.render(<StrictMode><Row>{ children }</Row></StrictMode>);
  root.frame();
}

function expectRow (labels: string[]) {
  expect(xs(root.stage, labels)).toEqual(labels.map((_, i) => i * 10));
}

function expectAlive (labels: string[]) {
  expect(labels.map((label) => [ label, refs[label].current!.layout.isFreed ])).toEqual(labels.map((label) => [ label, false ]));
}

beforeEach(async () => {
  root = createTestRoot();
  refs = {};
  await root.render(<StrictMode><Row /></StrictMode>);
  await until(() => !!root.stage.getChildByLabel('root', true));
});

afterEach(async () => {
  await root.unmount();
  expect(root.errors).toEqual([]);
});

describe('StrictMode', () => {

  it('keeps layout nodes alive and lays them out', async () => {
    await render([ box('A'), box('B') ]);
    expectAlive([ 'root', 'A', 'B' ]);
    expectRow([ 'A', 'B' ]);
  });

  it('keeps nested nodes in their parents', async () => {
    await render([ box('P', undefined, [ box('Q'), box('R') ]), box('S') ]);
    expectAlive([ 'root', 'P', 'Q', 'R', 'S' ]);
    expectRow([ 'Q', 'R' ]);
    expect(xs(root.stage, [ 'P', 'S' ])).toEqual([ 0, 10 ]);
  });

  it('follows reorders, inserts and removals', async () => {
    await render([ box('A', 2), box('B', 1), box('C') ]);
    await render([ box('C'), box('A', 2), box('B', 1) ]);
    expectRow([ 'C', 'A', 'B' ]);

    await render([ box('C'), box('D'), box('A', 2), box('B', 1) ]);
    expectAlive([ 'D' ]);
    expectRow([ 'C', 'D', 'A', 'B' ]);

    await render([ box('C'), box('B', 1) ]);
    expectRow([ 'C', 'B' ]);
  });

  it('follows a reorder inside a Fragment', async () => {
    await render(<Fragment>{ box('A') }{ box('B') }{ box('C') }</Fragment>);
    await render(<Fragment>{ box('C') }{ box('A') }{ box('B') }</Fragment>);
    expectAlive([ 'A', 'B', 'C' ]);
    expectRow([ 'C', 'A', 'B' ]);
  });

  it('lays out views in a plain pixi container on their own', async () => {
    await render([ box('A'), <pixiContainer key="w">{ box('W1') }</pixiContainer>, box('B') ]);
    expectAlive([ 'A', 'W1', 'B' ]);
    expectRow([ 'A', 'B' ]);
    expect(xs(root.stage, [ 'W1' ])).toEqual([ 0 ]);
  });

  it('lays out a LayoutNode and renders its content', async () => {
    await render([
      box('A'),
      <LayoutNode key="n" ref={ ref('N') as never } style={{ width: 30, height: 10 }}>
        { ({ width }) => <pixiContainer label="content" x={ width } /> }
      </LayoutNode>,
      box('B')
    ]);
    expectAlive([ 'A', 'N', 'B' ]);
    expect(xs(root.stage, [ 'A', 'B', 'content' ])).toEqual([ 0, 40, 30 ]);
  });

  it('keeps a measure function', async () => {
    await render([
      <LayoutNode key="m" measure={ () => ({ width: 30, height: 10 }) } />,
      box('A')
    ]);
    expect(xs(root.stage, [ 'A' ])).toEqual([ 30 ]);
  });

});
