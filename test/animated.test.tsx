import { createRef } from 'react';
import type { Graphics as PixiGraphics } from 'pixi.js';
import { PositionType } from 'yoga-layout/load';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Container, type ContainerRef } from '../src';
import { animated, Globals, SpringValue } from '../src/react-spring';
import { createTestRoot, find, settle, until } from './render';

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

async function render (element: React.ReactNode, label: string) {
  await root.render(element);
  await until(() => !!root.stage.getChildByLabel(label, true));
  root.frame();
}

describe('animated layout props', () => {

  it('lays out width, height, left and top given as props, rather than setting them on the view', async () => {
    await render(
      <Container label="root" style={{ width: 200, height: 200 }}>
        <animated.Container label="A" width={ 30 } height={ 20 } left={ 5 } top={ 7 } style={{ position: 'absolute' }} />
      </Container>,
      'A'
    );

    const view = find(root.stage, 'A') as unknown as ContainerRef['view'];
    expect(view.layoutBox.width).toBe(30);
    expect(view.layoutBox.height).toBe(20);
    expect([ view.x, view.y ]).toEqual([ 5, 7 ]);
    // Setting `width` on a pixi container scales it.
    expect([ view.scale.x, view.scale.y ]).toEqual([ 1, 1 ]);
  });

  it('lays out a spring as it changes, without scaling the view', async () => {
    const width = new SpringValue(30);

    await render(
      <Container label="root" style={{ width: 200, height: 200, flexDirection: 'row' }}>
        <animated.Container label="A" width={ width } style={{ height: 10 }} />
        <Container label="B" style={{ width: 10, height: 10 }} />
      </Container>,
      'B'
    );

    expect(find(root.stage, 'B').x).toBe(30);

    width.set(50);
    await settle();
    root.frame();

    expect((find(root.stage, 'A') as unknown as ContainerRef['view']).layoutBox.width).toBe(50);
    expect(find(root.stage, 'B').x).toBe(50);
    expect(find(root.stage, 'A').scale.x).toBe(1);
  });

  it('lays out any layout key given as a prop, as the example animates marginLeft on Graphics', async () => {
    const marginLeft = new SpringValue(0);
    const draw = (g: PixiGraphics) => { g.clear(); g.rect(0, 0, 10, 10); g.fill('white'); };

    await render(
      <Container label="root" style={{ width: 200, height: 200, flexDirection: 'row' }}>
        <animated.Graphics label="A" marginLeft={ marginLeft } draw={ draw } style={{ width: 10, height: 10 }} />
        <Container label="B" style={{ width: 10, height: 10 }} />
      </Container>,
      'B'
    );

    expect(find(root.stage, 'B').x).toBe(10);

    marginLeft.set(40);
    await settle();
    root.frame();

    expect(find(root.stage, 'A').x).toBe(40);
    expect(find(root.stage, 'B').x).toBe(50);
    expect('marginLeft' in find(root.stage, 'A')).toBe(false);
  });

  it('leaves position to the view rather than laying it out as the position type', async () => {
    const ref = createRef<ContainerRef>();

    await render(
      <Container label="root" style={{ width: 200, height: 200 }}>
        <animated.Container label="A" ref={ ref } position={{ x: 3, y: 4 }} style={{ width: 10, height: 10 }} />
      </Container>,
      'A'
    );

    expect(ref.current!.layout.node.getPositionType()).toBe(PositionType.Relative);
  });

  it('sets animated non-layout props on the view', async () => {
    const alpha = new SpringValue(1);

    await render(<animated.Container label="A" alpha={ alpha } style={{ width: 10, height: 10 }} />, 'A');

    alpha.set(0.25);
    await settle();

    expect(find(root.stage, 'A').alpha).toBe(0.25);
  });

});

describe('applyLayoutProperties', () => {

  it('reverts a dropped animated value to the style value', async () => {
    const ref = createRef<ContainerRef>();

    await render(
      <Container label="root" style={{ width: 200, height: 200, flexDirection: 'row' }}>
        <Container label="A" ref={ ref } style={{ width: 10, height: 10 }} />
        <Container label="B" style={{ width: 10, height: 10 }} />
      </Container>,
      'B'
    );

    ref.current!.layout.applyLayoutProperties({ width: 40 });
    root.frame();
    expect(find(root.stage, 'B').x).toBe(40);

    ref.current!.layout.applyLayoutProperties({});
    root.frame();
    expect(find(root.stage, 'B').x).toBe(10);
  });

  it('reverts a dropped animated value that the style does not set to the default', async () => {
    const ref = createRef<ContainerRef>();

    await render(
      <Container label="root" style={{ width: 200, height: 200, flexDirection: 'row' }}>
        <Container label="A" ref={ ref } style={{ width: 10, height: 10 }} />
        <Container label="B" style={{ width: 10, height: 10 }} />
      </Container>,
      'B'
    );

    ref.current!.layout.applyLayoutProperties({ marginLeft: 25 });
    root.frame();
    expect(find(root.stage, 'A').x).toBe(25);

    ref.current!.layout.applyLayoutProperties({});
    root.frame();
    expect(find(root.stage, 'A').x).toBe(0);
    expect(find(root.stage, 'B').x).toBe(10);
  });

  it('reports whether anything changed', async () => {
    const ref = createRef<ContainerRef>();

    await render(<Container label="A" ref={ ref } style={{ width: 10, height: 10 }} />, 'A');

    expect(ref.current!.layout.applyLayoutProperties({ width: 40 })).toBe(true);
    expect(ref.current!.layout.applyLayoutProperties({ width: 40 })).toBe(false);
  });

});
