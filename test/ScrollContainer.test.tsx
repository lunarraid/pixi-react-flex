import { createRef, StrictMode, type ReactNode, type RefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Graphics, Point, type Container as PixiContainer, type FederatedPointerEvent, type FederatedWheelEvent } from 'pixi.js';
import { Container, ScrollController, scrollDragEvents, ScrollContainer, type LayoutViewMembers, type ScrollContainerProps, type Style } from '../src';
import { createTestRoot, find, layoutBox, until } from './render';

/*
 * ScrollContainer, after React Native's ScrollView: a viewport that stays put, and content in it that is as long as its
 * children need along the scrolling axis, moved by its layout translation.
 */

let root: ReturnType<typeof createTestRoot>;
let scroll: RefObject<ScrollController | null>;

function Box ({ label, width, height }: { label: string, width?: Style['width'], height?: Style['height'] }) {
  return <Container label={ label } style={{ width, height }} />;
}

async function render (props: ScrollContainerProps, children: ReactNode, Wrapper: typeof StrictMode | null = null) {
  const view = (
    <Container label="root" style={{ width: 300, height: 500 }}>
      <ScrollContainer label="viewport" ref={ scroll } style={{ flex: 1 }} { ...props }>
        { children }
      </ScrollContainer>
    </Container>
  );

  await root.render(Wrapper ? <Wrapper>{ view }</Wrapper> : view);
  await until(() => !!root.stage.getChildByLabel('viewport', true));
  root.frame();
}

const viewport = () => find(root.stage, 'viewport');

/** The content container: the viewport's only layout child (the other is its mask). */
const content = () => viewport().children.find((child) => !(child instanceof Graphics)) as PixiContainer & LayoutViewMembers;

const rows = (count: number, height = 200) => Array.from({ length: count }, (_, i) => <Box key={ i } label={ `row${ i }` } height={ height } />);

/** What the controller reads from a pointer event. */
function pointer (x: number, y: number) {
  return { isPrimary: true, global: new Point(x, y) } as FederatedPointerEvent;
}

function wheel (deltaY: number) {
  return { deltaX: 0, deltaY } as FederatedWheelEvent;
}

beforeEach(() => {
  // For pixi's shared ticker, which the controller settles and flings on; there are no frames under node.
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});

  root = createTestRoot();
  scroll = createRef<ScrollController>();
});

afterEach(async () => {
  await root.unmount();
  expect(root.errors).toEqual([]);
  expect(scrollDragEvents.listenerCount('dragStart')).toBe(0);
  vi.unstubAllGlobals();
});

describe('layout', () => {

  it('makes the content as tall as its children and as wide as the viewport', async () => {
    await render({}, rows(4));

    expect(layoutBox(root.stage, 'viewport')).toMatchObject({ width: 300, height: 500 });
    expect(content().layoutBox).toMatchObject({ width: 300, height: 800 });
    expect(layoutBox(root.stage, 'row3')).toMatchObject({ width: 300, height: 200 });
    expect(find(root.stage, 'row3').y).toBe(600);

    expect(scroll.current).toMatchObject({ clientWidth: 300, clientHeight: 500, scrollWidth: 300, scrollHeight: 800 });
  });

  it('fills the viewport when the children are shorter', async () => {
    await render({}, rows(1));

    expect(content().layoutBox.height).toBe(500);
    expect(scroll.current!.scrollHeight).toBe(500);
  });

  it('makes horizontal content as wide as its children', async () => {
    await render({ horizontal: true }, [ 0, 1, 2 ].map((i) => <Box key={ i } label={ `page${ i }` } width={ 300 } height="100%" />));

    expect(content().layoutBox).toMatchObject({ width: 900, height: 500 });
    expect(layoutBox(root.stage, 'page2')).toMatchObject({ width: 300, height: 500 });
    expect(find(root.stage, 'page2').x).toBe(600);
    expect(scroll.current!.scrollWidth).toBe(900);
  });

  it('lays the children out by the content container style', async () => {
    await render({ contentContainerStyle: { paddingTop: 32, alignItems: 'center' } }, <Box label="child" width={ 100 } height={ 100 } />);

    const child = find(root.stage, 'child');
    expect([ child.x, child.y ]).toEqual([ 100, 32 ]);
  });

  it('reports the content size when it changes', async () => {
    const onContentSizeChange = vi.fn();

    await render({ onContentSizeChange }, rows(2));
    expect(onContentSizeChange).toHaveBeenLastCalledWith(300, 500);

    await render({ onContentSizeChange }, rows(4));
    expect(onContentSizeChange).toHaveBeenLastCalledWith(300, 800);
  });

  it('masks the viewport to its box, once, under StrictMode too', async () => {
    await render({}, rows(4), StrictMode);

    const masks = viewport().children.filter((child) => child instanceof Graphics);
    expect(masks).toHaveLength(1);
    expect(viewport().mask).toBe(masks[0]);
    expect(masks[0].getLocalBounds()).toMatchObject({ minX: 0, minY: 0, maxX: 300, maxY: 500 });
  });

});

describe('scrolling', () => {

  it('moves the content, not the viewport or the layout', async () => {
    await render({}, rows(4));

    scroll.current!.scrollTop = 120;

    expect(content().y).toBe(-120);
    expect(viewport().y).toBe(0);
    expect(find(root.stage, 'row1').y).toBe(200);

    // Layout places the content at its box, and the scroll offset stays on top of it.
    root.frame();
    expect(content().y).toBe(-120);
  });

  it('stays inside the content without bounce', async () => {
    await render({ isBounceEnabled: false }, rows(4));

    scroll.current!.scrollTop = 5000;
    expect(scroll.current!.scrollTop).toBe(300);

    scroll.current!.scrollTop = -50;
    expect(scroll.current!.scrollTop).toBe(0);
  });

  it('resists scrolling past the ends with bounce', async () => {
    await render({}, rows(4));

    scroll.current!.scrollTo(0, -100);

    expect(scroll.current!.scrollTop).toBeLessThan(0);
    expect(scroll.current!.scrollTop).toBeGreaterThan(-100);
  });

  it('calls onScroll with the controller', async () => {
    const onScroll = vi.fn();
    await render({ onScroll }, rows(4));

    scroll.current!.scrollTo(0, 100);

    expect(onScroll).toHaveBeenCalledTimes(1);
    expect(onScroll.mock.calls[0][0].currentTarget).toBe(scroll.current);
  });

});

describe('dragging', () => {

  it('drags once the pointer passes the threshold, along the enabled axes', async () => {
    const onDragStart = vi.fn();
    const onDragStop = vi.fn();
    await render({ dragThreshold: 20, isScrollXEnabled: false, onDragStart, onDragStop }, rows(4));

    viewport().emit('pointerdown', pointer(100, 400));
    viewport().emit('pointermove', pointer(100, 390));
    expect(onDragStart).not.toHaveBeenCalled();

    viewport().emit('pointermove', pointer(150, 370));
    expect(onDragStart).toHaveBeenCalledTimes(1);

    viewport().emit('pointermove', pointer(180, 300));
    expect(scroll.current!.scrollTop).toBe(70);
    expect(scroll.current!.scrollLeft).toBe(0);

    viewport().emit('pointerup', pointer(180, 300));
    expect(onDragStop).toHaveBeenCalledTimes(1);
  });

  it('gives up its drag when another scroll container starts one', async () => {
    const other = new ScrollController();
    await render({}, rows(4));

    viewport().emit('pointerdown', pointer(100, 400));
    viewport().emit('pointermove', pointer(100, 300));
    scrollDragEvents.emit('dragStart', other);

    const { scrollTop } = scroll.current!;
    viewport().emit('pointermove', pointer(100, 200));
    expect(scroll.current!.scrollTop).toBe(scrollTop);
  });

  it('announces its drags', async () => {
    const onDragStart = vi.fn();
    scrollDragEvents.on('dragStart', onDragStart);

    await render({}, rows(4));
    viewport().emit('pointerdown', pointer(100, 400));
    viewport().emit('pointermove', pointer(100, 300));

    scrollDragEvents.off('dragStart', onDragStart);
    expect(onDragStart).toHaveBeenCalledWith(scroll.current);
  });

  it('scrolls by the wheel unless disabled', async () => {
    await render({}, rows(4));
    viewport().emit('wheel', wheel(40));
    expect(scroll.current!.scrollTop).toBe(40);

    await render({ isScrollWheelEnabled: false }, rows(4));
    viewport().emit('wheel', wheel(40));
    expect(scroll.current!.scrollTop).toBe(40);
  });

});

describe('flinging', () => {

  /** The speed a release left the content with (points a second): the controller's own. */
  const velocity = () => (scroll.current as unknown as { _velocity: Point })._velocity.y;

  /** Moves the pointer up the viewport, each move at its time (ms), then lets it go at `upAt`. */
  function flick (moves: Array<[ time: number, y: number ]>, upAt: number) {
    const now = vi.spyOn(performance, 'now');
    for (const [ i, [ time, y ] ] of moves.entries()) {
      now.mockReturnValue(time);
      viewport().emit(i ? 'pointermove' : 'pointerdown', pointer(100, y));
    }
    now.mockReturnValue(upAt);
    viewport().emit('pointerup', pointer(100, moves.at(-1)![1]));
    now.mockRestore();
  }

  it('leaves with the pointer\'s speed over its last moves', async () => {
    await render({ dragThreshold: 5 }, rows(20));
    // 10 points every 16 ms: 625 a second.
    flick([ [ 0, 400 ], [ 16, 390 ], [ 32, 380 ], [ 48, 370 ], [ 64, 360 ], [ 80, 350 ] ], 81);
    expect(velocity()).toBeCloseTo(625, 0);
  });

  it('isn\'t thrown by moves handled together, as React Native hands queued touches over', async () => {
    await render({ dragThreshold: 5 }, rows(20));
    // The same flick, its last three moves handled within a millisecond after a busy frame: their last two alone
    // would be 10 points in 0.2 ms, 50,000 a second.
    flick([ [ 0, 400 ], [ 16, 390 ], [ 32, 380 ], [ 80, 370 ], [ 80.1, 360 ], [ 80.3, 350 ] ], 80.4);
    expect(velocity()).toBeCloseTo(50 / 80.3 * 1000, 0);
  });

  it('flings nothing when the pointer stopped before it was let go', async () => {
    await render({ dragThreshold: 5 }, rows(20));
    flick([ [ 0, 400 ], [ 16, 380 ], [ 32, 360 ] ], 200);
    expect(velocity()).toBe(0);
  });

});

describe('unmounting', () => {

  it('stops ticking and lets go of the viewport', async () => {
    await render({}, rows(4));
    const controller = scroll.current!;

    controller.setVelocity(0, 500);
    expect(controller.isTicking).toBe(true);

    await root.unmount();
    expect(controller.isTicking).toBe(false);
  });

});
