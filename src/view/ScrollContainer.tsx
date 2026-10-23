import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, type ForwardRefExoticComponent, type ReactNode, type Ref, type RefObject } from 'react';
import { EventEmitter, Graphics, Point, Ticker, type Container as PixiContainer, type FederatedPointerEvent, type FederatedWheelEvent } from 'pixi.js';
import type { OnLayoutFunction } from '../flex/Layout';
import type { Style } from '../flex/applyLayoutProperties';
import Container, { type ContainerProps, type ContainerRef, type LayoutContainer } from './Container';

const { abs, log, max, pow } = Math;

const VELOCITY_MIN = 0.1;

/** A fling's speed is the pointer's over its moves in this long before it was let go (from the oldest of them). */
const VELOCITY_WINDOW_MS = 100;

/**
 * The least time a fling's speed is measured over. Moves handled closer together than this say nothing of the finger's
 * speed: on React Native, touch moves queued during a busy frame are handled one after another, within a millisecond,
 * where the last two alone made a fling of tens of thousands of points a second.
 */
const VELOCITY_MIN_SPAN_MS = 30;

/** A pointer held still this long before it's let go flings nothing. */
const VELOCITY_STALE_MS = 80;

/** The moves a fling's speed is measured from: as many as a window's worth of 120 Hz moves, with room to spare. */
const MOVE_SAMPLES = 32;

const DAMPING = 0.01;
const LOG_DAMPING = log(DAMPING);

const ticker = Ticker.shared;

const SCRATCH_POINT = new Point();

/**
 * Drags of every scroll container: `dragStart` once a pointer has moved one's `dragThreshold`, and `dragStop` when
 * it's let go. A scroll container gives up its own drag when another's starts (one nested in it, or that it's nested
 * in), and so can anything else that follows the pointer (a button cancelling its press).
 */
export const scrollDragEvents = new EventEmitter<{
  dragStart: [ controller: ScrollController ],
  dragStop: [ controller: ScrollController ]
}>();

/** Emitted to `onScroll`, in the shape of a DOM scroll event. */
export interface ScrollEvent {
  currentTarget: ScrollController;
}

export type ScrollHandler = (event: ScrollEvent) => void;
export type DragHandler = (event: FederatedPointerEvent) => void;

interface ScrollHandlers {
  onScroll?: ScrollHandler | null;
  onDragStart?: DragHandler | null;
  onDrag?: DragHandler | null;
  onDragStop?: DragHandler | null;
}

/**
 * The scrolling of a `ScrollContainer`, and what a ref to one holds: the scroll position (in the shape of a DOM
 * element's, so what drives one, like react-window, can drive it), and the dragging, flinging and bouncing that move
 * it.
 *
 * It scrolls two views it's given by the component: the viewport, a box that stays put, takes the pointer and masks
 * what it shows, and the content in it, which is moved by its layout translation. Their sizes come from layout.
 */
export class ScrollController {

  isScrollWheelEnabled = true;
  isBounceEnabled = true;
  dragThreshold = 10;

  /** The component's latest handlers. */
  handlers: { readonly current: ScrollHandlers } = { current: {} };

  private _viewport: PixiContainer | null = null;
  private _content: LayoutContainer | null = null;
  private _mask: Graphics | null = null;

  private _viewportWidth = 0;
  private _viewportHeight = 0;
  private _contentWidth = 0;
  private _contentHeight = 0;

  private _scrollLeft = 0;
  private _scrollTop = 0;

  private _isScrollXEnabled = true;
  private _isScrollYEnabled = true;

  private _isPointerDown = false;
  private _isDragging = false;
  private readonly _initialPointerPosition = new Point();
  private readonly _lastPointerPosition = new Point();
  /** The pointer's recent positions, and when it was at them (`performance.now()`), oldest first. */
  private readonly _moves: Array<{ time: number, x: number, y: number }> = [];
  private readonly _velocity = new Point();
  private _isTicking = false;

  /** Takes the views to scroll, until `detach`. */
  attach (viewport: PixiContainer, content: LayoutContainer): void {
    this._viewport = viewport;
    this._content = content;

    const mask = this._mask = new Graphics();
    viewport.addChild(mask);
    viewport.mask = mask;

    viewport.on('pointerdown', this.onPointerDown, this);
    viewport.on('pointermove', this.onPointerMove, this);
    viewport.on('pointerup', this.onPointerUp, this);
    viewport.on('pointerupoutside', this.onPointerUp, this);
    viewport.on('pointercancel', this.onPointerUp, this);
    viewport.on('wheel', this.onWheel, this);

    scrollDragEvents.on('dragStart', this.onAnyDragStart, this);

    this.updateMask();
    this.applyScroll();
  }

  detach (): void {
    const viewport = this._viewport;
    const mask = this._mask;

    scrollDragEvents.off('dragStart', this.onAnyDragStart, this);

    this.isTicking = false;
    this._isPointerDown = false;
    this._isDragging = false;

    // Not when the view went first (it's destroyed with its listeners and children).
    if (viewport && !viewport.destroyed) {
      viewport.off('pointerdown', this.onPointerDown, this);
      viewport.off('pointermove', this.onPointerMove, this);
      viewport.off('pointerup', this.onPointerUp, this);
      viewport.off('pointerupoutside', this.onPointerUp, this);
      viewport.off('pointercancel', this.onPointerUp, this);
      viewport.off('wheel', this.onWheel, this);
      viewport.mask = null;
    }

    if (mask && !mask.destroyed) {
      mask.destroy();
    }

    this._viewport = null;
    this._content = null;
    this._mask = null;
  }

  /** Sets the visible size of the scroll area (the viewport's layout box). */
  setViewportSize (width: number, height: number): void {
    if (width === this._viewportWidth && height === this._viewportHeight) {
      return;
    }

    this._viewportWidth = width;
    this._viewportHeight = height;
    this.updateMask();
    this.onLayoutChanged();
  }

  /** Sets the scrollable size (the content's layout box). */
  setContentSize (width: number, height: number): void {
    if (width === this._contentWidth && height === this._contentHeight) {
      return;
    }

    this._contentWidth = width;
    this._contentHeight = height;
    this.onLayoutChanged();
  }

  /** The scrollable size may have changed: settles back inside it if needed. */
  private onLayoutChanged (): void {
    if (!this._isPointerDown) {
      this.isTicking = true;
    }
  }

  private updateMask (): void {
    this._mask?.clear().rect(0, 0, this._viewportWidth, this._viewportHeight).fill(0xffffff);
  }

  /** The content moves by its layout translation, which leaves its layout (and the viewport) alone. */
  private applyScroll (): void {
    const content = this._content;

    if (content) {
      content.translateX = -this._scrollLeft;
      content.translateY = -this._scrollTop;
    }
  }

  private emitScroll (): void {
    this.handlers.current.onScroll?.({ currentTarget: this });
  }

  private onAnyDragStart (controller: ScrollController): void {
    if (controller !== this) {
      this._isPointerDown = false;
      this._isDragging = false;
    }
  }

  getOverscrollLeft (value: number): number {
    let overscrollLeft = value < 0
      ? -value
      : value - (this.scrollWidth - this._viewportWidth);

    overscrollLeft = overscrollLeft / (this._viewportWidth * 0.5);

    if (overscrollLeft < 0) {
      overscrollLeft = 0;
    } else if (overscrollLeft > 1) {
      overscrollLeft = 1;
    }

    return overscrollLeft;
  }

  getOverscrollTop (value: number): number {
    let overscrollTop = value < 0
      ? -value
      : value - (this.scrollHeight - this._viewportHeight);

    overscrollTop = overscrollTop / (this._viewportHeight * 0.5);

    if (overscrollTop < 0) {
      overscrollTop = 0;
    } else if (overscrollTop > 1) {
      overscrollTop = 1;
    }

    return overscrollTop;
  }

  scrollBy (x: number, y: number): void {
    this.scrollTo(this.scrollLeft + x, this.scrollTop + y);
  }

  scrollTo (x: number, y: number): void {
    this.setVelocity(0, 0);

    const previousLeft = this.scrollLeft;
    const previousTop = this.scrollTop;

    const diffX = x - previousLeft;
    const diffY = y - previousTop;

    const overscrollLeft = this.getOverscrollLeft(x);
    this.scrollLeft = x - diffX * overscrollLeft;

    const overscrollTop = this.getOverscrollTop(y);
    this.scrollTop = y - diffY * overscrollTop;

    if (this.scrollTop !== previousTop || this.scrollLeft !== previousLeft) {
      this.emitScroll();
    }

    if (!this._isDragging && (overscrollLeft || overscrollTop)) {
      this.isTicking = true;
    }
  }

  setVelocity (vx = 0, vy = 0): void {
    if (vx < VELOCITY_MIN && vx > -VELOCITY_MIN) {
      vx = 0;
    }

    if (vy < VELOCITY_MIN && vy > -VELOCITY_MIN) {
      vy = 0;
    }

    this._velocity.set(vx, vy);

    if (vx || vy) {
      this.isTicking = true;
    }
  }

  /** The pointer in the viewport, which (unlike the content) doesn't move as it scrolls. */
  private getPointerPosition (event: FederatedPointerEvent, point: Point): Point {
    return this._viewport!.toLocal(event.global, undefined, point, true);
  }

  private onPointerDown (event: FederatedPointerEvent): void {
    if (!event.isPrimary) {
      return;
    }

    this.getPointerPosition(event, this._initialPointerPosition);
    this._lastPointerPosition.copyFrom(this._initialPointerPosition);
    this._moves.length = 0;
    this.recordMove(this._initialPointerPosition);
    this._isPointerDown = true;
    this.setVelocity(0, 0);
    this.isTicking = false;
  }

  private onPointerMove (event: FederatedPointerEvent): void {
    if (!this._isPointerDown || !event.isPrimary) {
      return;
    }

    const newPosition = this.getPointerPosition(event, SCRATCH_POINT);

    const dx = this._isScrollXEnabled ? this._lastPointerPosition.x - newPosition.x : 0;
    const dy = this._isScrollYEnabled ? this._lastPointerPosition.y - newPosition.y : 0;

    this._lastPointerPosition.copyFrom(newPosition);
    this.recordMove(newPosition);

    if (this._isDragging) {
      this.scrollBy(dx, dy);
      this.handlers.current.onDrag?.(event);
      return;
    }

    const didDrag = (this._isScrollXEnabled && abs(this._initialPointerPosition.x - newPosition.x) > this.dragThreshold)
      || (this._isScrollYEnabled && abs(this._initialPointerPosition.y - newPosition.y) > this.dragThreshold);

    if (didDrag) {
      this._isDragging = true;
      scrollDragEvents.emit('dragStart', this);
      this.handlers.current.onDragStart?.(event);
    }
  }

  private onPointerUp (event: FederatedPointerEvent): void {
    if (!this._isPointerDown || !event.isPrimary) {
      return;
    }

    this._isPointerDown = false;

    if (!this._isDragging) {
      return;
    }

    const maxX = this.scrollWidth - this._viewportWidth;
    const maxY = this.scrollHeight - this._viewportHeight;
    const { x: vx, y: vy } = this.releaseVelocity(SCRATCH_POINT);
    const multiplierX = (this.scrollLeft < 0 || this.scrollLeft > maxX) ? 0.25 : 1;
    const multiplierY = (this.scrollTop < 0 || this.scrollTop > maxY) ? 0.25 : 1;

    this.setVelocity(vx * multiplierX, vy * multiplierY);
    this.handlers.current.onDragStop?.(event);
    this._isDragging = false;
    this.isTicking = true;
    scrollDragEvents.emit('dragStop', this);
  }

  private recordMove ({ x, y }: Point): void {
    const moves = this._moves;
    if (moves.length === MOVE_SAMPLES) {
      moves.shift();
    }
    moves.push({ time: performance.now(), x, y });
  }

  /**
   * The scrolling speed the pointer leaves with, in points a second: its average over its moves in the last
   * `VELOCITY_WINDOW_MS` before its last one (over at least `VELOCITY_MIN_SPAN_MS`, from moves before the window if it
   * must); none if it stopped before it was let go.
   */
  private releaseVelocity (out: Point): Point {
    const moves = this._moves;
    const last = moves[moves.length - 1];

    if (!last || performance.now() - last.time > VELOCITY_STALE_MS) {
      return out.set(0, 0);
    }

    let from = last;
    for (let i = moves.length - 2; i >= 0; i--) {
      const move = moves[i];
      if (last.time - move.time > VELOCITY_WINDOW_MS && last.time - from.time >= VELOCITY_MIN_SPAN_MS) {
        break;
      }
      from = move;
    }

    const perSecond = 1000 / max(last.time - from.time, VELOCITY_MIN_SPAN_MS);
    return out.set(
      this._isScrollXEnabled ? (from.x - last.x) * perSecond : 0,
      this._isScrollYEnabled ? (from.y - last.y) * perSecond : 0
    );
  }

  private onWheel ({ deltaX, deltaY }: FederatedWheelEvent): void {
    if (this.isScrollWheelEnabled) {
      this.scrollBy(this._isScrollXEnabled ? deltaX : 0, this._isScrollYEnabled ? deltaY : 0);
    }
  }

  private onTick (): void {
    const dt = ticker.deltaMS * 0.001;
    const powDamping = pow(DAMPING, dt);
    const dampingMultiplier = (powDamping - 1) / LOG_DAMPING;
    const maxX = this.scrollWidth - this._viewportWidth;
    const maxY = this.scrollHeight - this._viewportHeight;

    let { x: vx, y: vy } = this._velocity;
    let left = this.scrollLeft + vx * dampingMultiplier;
    let top = this.scrollTop + vy * dampingMultiplier;

    vx *= powDamping;
    vy *= powDamping;

    if (left < 0) {
      left = left > -1 ? 0 : left * powDamping;
      vx *= 0.5;
    } else if (left > maxX) {
      left = left - maxX > 1 ? left * powDamping + maxX * (1 - powDamping) : maxX;
      vx *= 0.5;
    }

    if (top < 0) {
      top = top > -1 ? 0 : top * powDamping;
      vy *= 0.5;
    } else if (top > maxY) {
      top = top - maxY > 1 ? top * powDamping + maxY * (1 - powDamping) : maxY;
      vy *= 0.5;
    }

    this.setVelocity(vx, vy);

    const isTickComplete = !this._velocity.x
      && !this._velocity.y
      && left >= 0
      && left <= maxX
      && top >= 0
      && top <= maxY;

    if (isTickComplete) {
      this.isTicking = false;
    }

    const previousLeft = this.scrollLeft;
    const previousTop = this.scrollTop;

    this.scrollLeft = left;
    this.scrollTop = top;

    if (this.scrollLeft !== previousLeft || this.scrollTop !== previousTop) {
      this.emitScroll();
    }
  }

  get scrollLeft (): number {
    return this._scrollLeft;
  }

  set scrollLeft (value: number) {
    if (!this.isBounceEnabled) {
      const maxScroll = this.scrollWidth - this._viewportWidth;
      value = value < 0 ? 0 : (value > maxScroll ? maxScroll : value);
    }

    this._scrollLeft = value;
    this.applyScroll();
  }

  get scrollTop (): number {
    return this._scrollTop;
  }

  set scrollTop (value: number) {
    if (!this.isBounceEnabled) {
      const maxScroll = this.scrollHeight - this._viewportHeight;
      value = value < 0 ? 0 : (value > maxScroll ? maxScroll : value);
    }

    this._scrollTop = value;
    this.applyScroll();
  }

  /** The width of the content, or the viewport if that is wider. */
  get scrollWidth (): number {
    return max(this._viewportWidth, this._contentWidth);
  }

  /** The height of the content, or the viewport if that is taller. */
  get scrollHeight (): number {
    return max(this._viewportHeight, this._contentHeight);
  }

  get clientWidth (): number {
    return this._viewportWidth;
  }

  get clientHeight (): number {
    return this._viewportHeight;
  }

  get isTicking (): boolean {
    return this._isTicking;
  }

  set isTicking (value: boolean) {
    if (this._isTicking === value) {
      return;
    }

    this._isTicking = value;

    value
      ? ticker.add(this.onTick, this)
      : ticker.remove(this.onTick, this);
  }

  get isScrollXEnabled (): boolean {
    return this._isScrollXEnabled;
  }

  set isScrollXEnabled (value: boolean) {
    if (!value) {
      this._velocity.x = 0;
    }

    this._isScrollXEnabled = value;
  }

  get isScrollYEnabled (): boolean {
    return this._isScrollYEnabled;
  }

  set isScrollYEnabled (value: boolean) {
    if (!value) {
      this._velocity.y = 0;
    }

    this._isScrollYEnabled = value;
  }

}

/** The display object props go to the viewport. */
export type ScrollContainerProps = Omit<ContainerProps, 'style' | 'children' | 'measure'> & {
  children?: ReactNode,
  /** The style of the box that scrolls: its size and its place in its parent. It sets its own `overflow`. */
  style?: Style,
  /** The style of the content in it, which lays out the children: direction, padding, alignment. */
  contentContainerStyle?: Style,
  /**
   * Lays the content out in a row that is as wide as it needs, rather than a column as tall as it needs. The content
   * has no width of its own then, so children can't size themselves as a percentage of it.
   */
  horizontal?: boolean,
  isScrollXEnabled?: boolean,
  isScrollYEnabled?: boolean,
  isScrollWheelEnabled?: boolean,
  /** Whether it can be dragged and flung past its ends, to settle back. */
  isBounceEnabled?: boolean,
  /** How far the pointer moves before it drags. */
  dragThreshold?: number,
  onScroll?: ScrollHandler | null,
  onDragStart?: DragHandler | null,
  onDrag?: DragHandler | null,
  onDragStop?: DragHandler | null,
  /** Called with the size of the content whenever it's laid out. */
  onContentSizeChange?: (width: number, height: number) => void
};

/** `value` as of the last commit, for callbacks that outlive the render they were made in. */
function useLatest<T> (value: T): RefObject<T> {
  const ref = useRef(value);

  useLayoutEffect(() => {
    ref.current = value;
  });

  return ref;
}

/**
 * A box that scrolls its children, after React Native's `ScrollView`: a viewport, whose `overflow` lets the content in
 * it be as long as it needs along the scrolling axis. Its ref is the `ScrollController`.
 */
const ScrollContainer: ForwardRefExoticComponent<ScrollContainerProps & { ref?: Ref<ScrollController> }> = forwardRef<ScrollController, ScrollContainerProps>(function ScrollContainer (props, ref) {

  const {
    children,
    style,
    contentContainerStyle,
    horizontal = false,
    isScrollXEnabled = true,
    isScrollYEnabled = true,
    isScrollWheelEnabled = true,
    isBounceEnabled = true,
    dragThreshold = 10,
    onScroll,
    onDragStart,
    onDrag,
    onDragStop,
    onContentSizeChange,
    onLayout,
    ...viewProps
  } = props;

  const [ controller ] = useState(() => new ScrollController());
  const viewport = useRef<ContainerRef>(null);
  const content = useRef<ContainerRef>(null);
  const latest = useLatest({ onLayout, onContentSizeChange });
  const handlers = useLatest<ScrollHandlers>({ onScroll, onDragStart, onDrag, onDragStop });

  useImperativeHandle(ref, () => controller, [ controller ]);

  useLayoutEffect(() => {
    controller.handlers = handlers;
    controller.attach(viewport.current!.view, content.current!.view);
    return () => controller.detach();
  }, [ controller, handlers ]);

  useLayoutEffect(() => {
    controller.isScrollXEnabled = isScrollXEnabled;
    controller.isScrollYEnabled = isScrollYEnabled;
    controller.isScrollWheelEnabled = isScrollWheelEnabled;
    controller.isBounceEnabled = isBounceEnabled;
    controller.dragThreshold = dragThreshold;
  }, [ controller, isScrollXEnabled, isScrollYEnabled, isScrollWheelEnabled, isBounceEnabled, dragThreshold ]);

  const [ callbacks ] = useState(() => {
    const onViewportLayout: OnLayoutFunction = (x, y, width, height) => {
      controller.setViewportSize(width, height);
      latest.current.onLayout?.(x, y, width, height);
    };

    const onContentLayout: OnLayoutFunction = (x, y, width, height) => {
      controller.setContentSize(width, height);
      latest.current.onContentSizeChange?.(width, height);
    };

    return { onViewportLayout, onContentLayout };
  });

  const flexDirection = horizontal ? 'row' : 'column';

  return (
    <Container
      eventMode="static"
      { ...viewProps }
      ref={ viewport }
      style={{ ...style, flexDirection, overflow: 'scroll' }}
      onLayout={ callbacks.onViewportLayout }
    >
      <Container
        ref={ content }
        style={{ flexDirection, flexGrow: 1, flexShrink: 0, ...contentContainerStyle }}
        onLayout={ callbacks.onContentLayout }
      >
        { children }
      </Container>
    </Container>
  );

});

ScrollContainer.displayName = 'ScrollContainer';

export default ScrollContainer;
