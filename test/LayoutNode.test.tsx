import { Fragment, Profiler, useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Container as PixiContainer } from 'pixi.js';
import { Container, LayoutNode, type LayoutNodeLayout } from '../src';
import { createTestRoot, drawOrder, find, settle, until, xs } from './render';

/*
 * LayoutNode: a node that takes part in layout without a view of its own, reporting its layout to `onLayout` and to a
 * render function. It's placed by an empty marker container, so it's ordered and bounded like any other layout view.
 */

let root: ReturnType<typeof createTestRoot>;

function Row ({ children }: { children?: ReactNode }) {
  return (
    <Container label="root" style={{ width: 1000, height: 100, flexDirection: 'row' }}>
      { children }
    </Container>
  );
}

function Box ({ label }: { label: string }) {
  return <Container label={ label } style={{ width: 10, height: 10 }} />;
}

/** A shadow node that renders a plain marker of its own, labelled, at its box's origin. */
function Shadow ({ label, width = 10, zIndex }: { label: string, width?: number, zIndex?: number }) {
  return (
    <LayoutNode label={ `${ label }-marker` } zIndex={ zIndex } style={{ width, height: 10 }}>
      { () => <pixiContainer label={ label } /> }
    </LayoutNode>
  );
}

/** Where each shadow node's box was laid out. */
function shadowXs (labels: string[]) {
  return labels.map((label) => find(root.stage, `${ label }-marker`).x);
}

async function render (children: ReactNode) {
  await root.render(<Row>{ children }</Row>);
  root.frame();
  // Content renders after the layout that it's given.
  await root.render(<Row>{ children }</Row>);
  root.frame();
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

describe('layout', () => {

  it('takes space and reports its layout', async () => {
    const onLayout = vi.fn();

    await render([ <Box key="a" label="A" />, <LayoutNode key="n" style={{ width: 50, height: 20 }} onLayout={ onLayout } />, <Box key="b" label="B" /> ]);

    expect(xs(root.stage, [ 'A', 'B' ])).toEqual([ 0, 60 ]);
    expect(onLayout).toHaveBeenLastCalledWith(10, 0, 50, 20);
  });

  it('takes its size from a measure function', async () => {
    await render([ <LayoutNode key="n" measure={ () => ({ width: 30, height: 10 }) } />, <Box key="b" label="B" /> ]);
    expect(xs(root.stage, [ 'B' ])).toEqual([ 30 ]);
  });

  it('renders for a layout change only when it has content', async () => {
    let grow = () => {};

    // Resizes itself without its parent re-rendering, which moves the node after it.
    function Growing () {
      const [ width, setWidth ] = useState(10);
      grow = () => setWidth(20);
      return <Container label="G" style={{ width, height: 10 }} />;
    }

    async function commitsForLayoutChange (content?: () => ReactNode) {
      const onRender = vi.fn();
      const onLayout = vi.fn();

      await render([
        <Growing key="g" />,
        <Profiler key="n" id="n" onRender={ onRender }>
          <LayoutNode style={{ width: 50, height: 10 }} onLayout={ onLayout }>{ content }</LayoutNode>
        </Profiler>
      ]);

      const before = onRender.mock.calls.length;
      grow();
      await settle();
      root.frame();
      await settle();

      expect(onLayout).toHaveBeenLastCalledWith(20, 0, 50, 10);
      return onRender.mock.calls.length - before;
    }

    expect(await commitsForLayoutChange()).toBe(0);
    await render(null);
    expect(await commitsForLayoutChange(() => <pixiContainer />)).toBe(1);
  });

});

describe('render function', () => {

  it('renders content in its box once laid out, with its layout', async () => {
    const content = vi.fn((layout: LayoutNodeLayout) => <pixiContainer label="content" x={ layout.width } />);

    await render([ <Box key="a" label="A" />, <LayoutNode key="n" style={{ width: 50, height: 20 }}>{ content }</LayoutNode> ]);

    // Only ever with its layout: never before it, at a placeholder size.
    expect(content.mock.calls.length).toBeGreaterThan(0);
    expect(content.mock.calls.every(([ layout ]) => layout.width === 50 && layout.x === 10)).toBe(true);
    expect(content).toHaveBeenLastCalledWith({ x: 10, y: 0, width: 50, height: 20 });
    // In the node's box: its marker is at the box, the content at the width within it.
    const marker = find(root.stage, 'content').parent!;
    expect([ marker.x, find(root.stage, 'content').x ]).toEqual([ 10, 50 ]);
  });

  it('renders again when its layout changes', async () => {
    const content = vi.fn(({ width }: LayoutNodeLayout) => <pixiContainer label="content" x={ width } />);

    await render(<LayoutNode style={{ width: 50, height: 20 }}>{ content }</LayoutNode>);
    await render(<LayoutNode style={{ width: 70, height: 20 }}>{ content }</LayoutNode>);

    expect(find(root.stage, 'content').x).toBe(70);
  });

  it('renders content given after it was laid out', async () => {
    await render(<LayoutNode style={{ width: 50, height: 20 }} />);
    await render(<LayoutNode style={{ width: 50, height: 20 }}>{ ({ width }) => <pixiContainer label="content" x={ width } /> }</LayoutNode>);

    expect(find(root.stage, 'content').x).toBe(50);
  });

  it('does not lay out its content', async () => {
    await render([
      <LayoutNode key="n" style={{ width: 50, height: 20 }}>{ () => <Box label="inside" /> }</LayoutNode>,
      <Box key="b" label="B" />
    ]);

    expect(xs(root.stage, [ 'B', 'inside' ])).toEqual([ 50, 0 ]);
  });

  it('does not lay out its content, which does not size it', async () => {
    await render([
      <LayoutNode key="n" style={{ padding: 5 }}>{ () => <Box label="inside" /> }</LayoutNode>,
      <Box key="b" label="B" />
    ]);

    // The node is only its padding, and the content is a root of its own, at its origin.
    expect(xs(root.stage, [ 'B', 'inside' ])).toEqual([ 10, 0 ]);
  });

  it('rejects children that are not a function', async () => {
    // @ts-expect-error not a function
    await root.render(<Row><LayoutNode><Box label="X" /></LayoutNode></Row>);
    expect(root.errors.map((error) => (error as Error).message)).toEqual([ 'LayoutNode children must be a function of its layout' ]);
    root.errors.length = 0;
  });

});

describe('placement', () => {

  function Shadows ({ labels }: { labels: string[] }) {
    return labels.map((label) => <Shadow key={ label } label={ label } />);
  }

  it('follows reorders among shadow nodes from one component', async () => {
    await render(<Shadows labels={ [ 'S1', 'S2', 'S3' ] } />);
    expect(shadowXs([ 'S1', 'S2', 'S3' ])).toEqual([ 0, 10, 20 ]);

    await render(<Shadows labels={ [ 'S3', 'S1', 'S2' ] } />);
    expect(shadowXs([ 'S3', 'S1', 'S2' ])).toEqual([ 0, 10, 20 ]);

    await render(<Shadows labels={ [ 'S3', 'S4', 'S2' ] } />);
    expect(shadowXs([ 'S3', 'S4', 'S2' ])).toEqual([ 0, 10, 20 ]);
  });

  it('follows reorders among shadow nodes in a Fragment', async () => {
    await render(<Fragment><Shadow key="1" label="S1" /><Shadow key="2" label="S2" /></Fragment>);
    await render(<Fragment><Shadow key="2" label="S2" /><Shadow key="1" label="S1" /></Fragment>);
    expect(shadowXs([ 'S2', 'S1' ])).toEqual([ 0, 10 ]);
  });

  it('takes no space in a plain pixi container', async () => {
    await render([
      <Box key="a" label="A" />,
      <pixiContainer key="w"><LayoutNode style={{ width: 50, height: 10 }} /></pixiContainer>,
      <Box key="b" label="B" />
    ]);
    expect(xs(root.stage, [ 'A', 'B' ])).toEqual([ 0, 10 ]);
  });

  it('draws its content by zIndex among its siblings', async () => {
    await render([ <Shadow key="1" label="S1" zIndex={ 1 } />, <Shadow key="2" label="S2" /> ]);
    expect(drawOrder(find(root.stage, 'root') as PixiContainer)).toEqual([ 'S2-marker', 'S1-marker' ]);
  });

});
