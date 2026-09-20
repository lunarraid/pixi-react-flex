import { StrictMode, createRef, type ReactNode } from 'react';
import type { Text as PixiText } from 'pixi.js';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Container, HTMLText, LayoutConfigContext, LayoutNode, Text, type ContainerRef, type LayoutNodeRef, type Style } from '../src';
import { animated, Globals, SpringValue } from '../src/react-spring';
import { createTestRoot, find, layoutBox, settle, until } from './render';

/*
 * A style changing between renders: what a dropped key goes back to, and what the last style leaves behind.
 */

let root: ReturnType<typeof createTestRoot>;

beforeAll(() => {
  // react-spring writes animated values on the next animation frame.
  Globals.assign({ requestAnimationFrame: (callback: () => void) => setTimeout(callback, 0) as unknown as number });
});

beforeEach(() => {
  root = createTestRoot();
});

afterEach(async () => {
  await root.unmount();
  expect(root.errors).toEqual([]);
});

async function render (element: ReactNode, label = 'B') {
  await root.render(element);
  await until(() => !!root.stage.getChildByLabel(label, true));
  root.frame();
}

function position (label: string) {
  const { x, y } = find(root.stage, label);
  return [ x, y ];
}

function tree (rootStyle: Style | undefined, childStyle?: Style) {
  return (
    <Container label="root" style={ rootStyle }>
      <Container label="A" style={{ width: 50, height: 50, ...childStyle }} />
      <Container label="B" style={{ width: 50, height: 50 }} />
    </Container>
  );
}

describe('a style that changes', () => {

  it('can become undefined', async () => {
    await render(tree({ width: 200, height: 200, flexDirection: 'row' }));
    expect(position('B')).toEqual([ 50, 0 ]);

    await render(tree(undefined));
    expect(position('B')).toEqual([ 0, 50 ]);
  });

  it('lays out as if a dropped key had never been set', async () => {
    await render(tree({ width: 200, height: 200, flexDirection: 'column-reverse' }));
    expect(position('B')).toEqual([ 0, 100 ]);

    await render(tree({ width: 200, height: 200 }));
    expect(position('A')).toEqual([ 0, 0 ]);
    expect(position('B')).toEqual([ 0, 50 ]);
  });

  it('drops flexShrink to the default, which does not shrink', async () => {
    await render(tree({ width: 60, height: 200, flexDirection: 'row' }, { flexShrink: 1 }));
    expect(layoutBox(root.stage, 'A').width).toBe(10);

    await render(tree({ width: 60, height: 200, flexDirection: 'row' }));
    expect(layoutBox(root.stage, 'A').width).toBe(50);
  });

  it('drops a key to the defaults of its config', async () => {
    const config = { useWebDefaults: true };
    const web = (style: Style) => <LayoutConfigContext.Provider value={ config }>{ tree(style) }</LayoutConfigContext.Provider>;

    await render(web({ width: 200, height: 200, flexDirection: 'column' }));
    expect(position('B')).toEqual([ 0, 50 ]);

    await render(web({ width: 200, height: 200 }));
    expect(position('B')).toEqual([ 50, 0 ]);
  });

  it.each([ 'margin', 'padding', 'borderWidth' ])('leaves no edges of the last %s behind', async (key) => {
    // Padding and borders place a child, so they go on the root.
    const styles = (value: number | string) => key === 'margin'
      ? tree({ width: 200, height: 200 }, { [key]: value })
      : tree({ width: 200, height: 200, [key]: value });

    await render(styles('10 20'));
    expect(position('A')).toEqual([ 20, 10 ]);

    await render(styles(5));
    expect(position('A')).toEqual([ 5, 5 ]);

    await render(styles('1 2 3 4'));
    expect(position('A')).toEqual([ 4, 1 ]);

    await render(styles('7 8 9'));
    expect(position('A')).toEqual([ 8, 7 ]);

    await render(styles('10 20'));
    await render(tree({ width: 200, height: 200 }));
    expect(position('A')).toEqual([ 0, 0 ]);
  });

  it('keeps an edge of its own through a shorthand change', async () => {
    await render(tree({ width: 200, height: 200 }, { margin: '10 20', marginLeft: 3 }));
    expect(position('A')).toEqual([ 3, 10 ]);

    await render(tree({ width: 200, height: 200 }, { margin: 5, marginLeft: 3 }));
    expect(position('A')).toEqual([ 3, 5 ]);
  });

  it('prefers an edge of its own to a shorthand wherever the two are in the style', async () => {
    await render(tree({ width: 200, height: 200 }, { marginLeft: 3, margin: '1 2 3 4' }));
    expect(position('A')).toEqual([ 3, 1 ]);

    // A change to the shorthand alone, which writes the same edges.
    await render(tree({ width: 200, height: 200 }, { marginLeft: 3, margin: '5 6 7 8' }));
    expect(position('A')).toEqual([ 3, 5 ]);
  });

  it('ends values set over the style when it is given one, even an equal one', async () => {
    const ref = createRef<ContainerRef>();

    const styled = () => (
      <Container label="root" style={{ width: 200, height: 200 }}>
        <Container label="B" ref={ ref } style={{ width: 50, height: 50, left: 1 }} />
      </Container>
    );

    await render(styled());
    ref.current!.layout.applyLayoutProperties({ marginLeft: 25, left: 2 });
    root.frame();
    expect(position('B')).toEqual([ 27, 0 ]);

    await render(styled());
    expect(position('B')).toEqual([ 1, 0 ]);
  });

  it('revives with the values set over its style while it was freed', async () => {
    const ref = createRef<ContainerRef>();

    await render(<Container label="B" ref={ ref } style={{ width: 200, height: 200 }} />);

    // As when its effects are disconnected.
    const { layout } = ref.current!;
    layout.node.free();
    layout.isFreed = true;

    expect(layout.applyLayoutProperties({ width: 120 })).toBe(false);
    layout.revive();
    root.frame();

    expect(layoutBox(root.stage, 'B').width).toBe(120);
    expect(layoutBox(root.stage, 'B').height).toBe(200);
  });

  it('takes a static value after an animated one, of the value it was last rendered with', async () => {
    const width = new SpringValue(30);

    const animatedTree = (value: SpringValue<number> | number) => (
      <Container label="root" style={{ width: 200, height: 200, flexDirection: 'row' }}>
        <animated.Container label="A" width={ value } style={{ height: 10 }} />
        <Container label="B" style={{ width: 10, height: 10 }} />
      </Container>
    );

    await render(animatedTree(width));
    width.set(50);
    await settle();
    root.frame();
    expect(position('B')).toEqual([ 50, 0 ]);

    await render(animatedTree(30));
    expect(position('B')).toEqual([ 30, 0 ]);
  });

  it('clears a value that becomes undefined while its key stays', async () => {
    await render(tree({ width: 200, height: 200 }, { margin: 10 }));
    expect(position('A')).toEqual([ 10, 10 ]);

    await render(tree({ width: 200, height: 200 }, { margin: undefined }));
    expect(position('A')).toEqual([ 0, 0 ]);
  });

  it('goes back to the style under an animated value that is dropped', async () => {
    const ref = createRef<ContainerRef>();

    await render(
      <Container label="root" style={{ width: 200, height: 200 }}>
        <Container label="B" ref={ ref } style={{ width: 50, height: 50, marginLeft: 3 }} />
      </Container>
    );

    ref.current!.layout.applyLayoutProperties({ margin: '10 20' });
    root.frame();
    expect(position('B')).toEqual([ 3, 10 ]);

    ref.current!.layout.applyLayoutProperties({});
    root.frame();
    expect(position('B')).toEqual([ 3, 0 ]);
  });

});

describe('a measure function', () => {

  it('measures again when it changes, and is set again on a node that was freed', async () => {
    const ref = createRef<LayoutNodeRef>();

    const measured = (width?: number) => (
      <StrictMode>
        <Container label="root" style={{ width: 200, height: 200, alignItems: 'flex-start' }}>
          <LayoutNode label="B" ref={ ref } measure={ width === undefined ? undefined : () => ({ width, height: 10 }) } />
        </Container>
      </StrictMode>
    );

    await render(measured(30));
    expect(layoutBox(root.stage, 'B').width).toBe(30);

    await render(measured(40));
    expect(layoutBox(root.stage, 'B').width).toBe(40);

    await render(measured());
    expect(layoutBox(root.stage, 'B').width).toBe(0);
  });

});

describe('a text style', () => {

  function countUpdates (label: string) {
    const { style } = find(root.stage, label) as PixiText;
    let count = 0;
    style.on('update', () => { count++; });
    return () => count;
  }

  it('is not written again by a render that does not change it', async () => {
    const fill = { color: 'red', alpha: 0.5 };
    const dropShadow = { alpha: 1, angle: 0, blur: 2, color: 'black', distance: 3 };
    const text = (x: number) => <Text label="B" text="hello" x={ x } style={{ width: 50, height: 10, fill, dropShadow, stroke: fill }} />;

    await render(text(0));
    const updates = countUpdates('B');

    await render(text(1));
    expect(updates()).toBe(0);
  });

  it('is not written again for HTML text either', async () => {
    const text = (x: number) => <HTMLText label="B" text="hello" x={ x } style={{ width: 50, height: 10 }} />;

    await render(text(0));
    const updates = countUpdates('B');

    await render(text(1));
    expect(updates()).toBe(0);
  });

  it('is written when it changes', async () => {
    await render(<Text label="B" text="hello" style={{ width: 50, height: 10, fontSize: 12 }} />);
    await render(<Text label="B" text="hello" style={{ width: 50, height: 10, fontSize: 14 }} />);
    expect((find(root.stage, 'B') as PixiText).style.fontSize).toBe(14);

    await render(<Text label="B" text="hello" style={{ width: 50, height: 10 }} />);
    expect((find(root.stage, 'B') as PixiText).style.fontSize).toBe(26);
  });

  it('takes a value that an animation moved it away from', async () => {
    const fontSize = new SpringValue(12);
    const text = (size: SpringValue<number> | number) => <animated.Text label="B" text="hello" style={{ width: 50, height: 10, fontSize: size }} />;

    await render(text(fontSize));
    fontSize.set(20);
    await settle();
    expect((find(root.stage, 'B') as PixiText).style.fontSize).toBe(20);

    await render(text(12));
    expect((find(root.stage, 'B') as PixiText).style.fontSize).toBe(12);
  });

  it('animates, along with layout values in the same style', async () => {
    const fontSize = new SpringValue(12);
    const width = new SpringValue(50);

    await render(<animated.Text label="B" text="hello" style={{ width, height: 10, fontSize }} />);

    fontSize.set(20);
    width.set(60);
    await settle();
    root.frame();

    expect((find(root.stage, 'B') as PixiText).style.fontSize).toBe(20);
    expect(layoutBox(root.stage, 'B').width).toBe(60);
  });

});
