import { Rectangle, type Container } from 'pixi.js';

/*
 * The transform model every flex view shares, after React Native: layout decides the view's box, and a transform
 * applies on top of it without affecting layout, about the box centre by default.
 *
 * - `translateX` / `translateY` move the view from its laid-out position, in its parent's units.
 * - `scale` / `scaleX` / `scaleY`, `rotation` and `skew` / `skewX` / `skewY` are pixi's own, applied about the
 *   transform origin. A view's size never comes from its scale (see `LayoutSprite`), so scale is the transform's alone.
 * - `transformOriginX` / `transformOriginY` place that origin as a fraction of the box (0.5 / 0.5, the centre, by
 *   default). It is set through pixi's `origin`, which transforms about a point without moving the view, so it is
 *   inert until the view is scaled, rotated or skewed. Views that set `pivot` themselves shouldn't be layout views:
 *   pixi warns when both are used.
 */

/** The transform props a layout view takes, besides pixi's own `scale`, `rotation` and `skew`. */
export interface LayoutTransformProps {
  translateX?: number;
  translateY?: number;
  transformOriginX?: number;
  transformOriginY?: number;
  scaleX?: number;
  scaleY?: number;
  skewX?: number;
  skewY?: number;
}

interface LayoutViewState {
  box: Rectangle;
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  originX: number;
  originY: number;
}

/** What `LayoutView` adds to a pixi view. */
export interface LayoutViewMembers extends Required<LayoutTransformProps> {
  /** The laid-out box, in the view's own (unscaled) coordinates. */
  readonly layoutBox: Rectangle;
  /** Places the view: called by its component whenever yoga lays it out. */
  applyLayout (x: number, y: number, width: number, height: number): void;
  /** Sizes the view to its box; views whose size is their content's (containers, text) leave it alone. */
  _applyLayoutSize (width: number, height: number): void;
  _applyLayoutPosition (): void;
  _applyLayoutOrigin (): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ViewConstructor = new (...args: any[]) => Container;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LayoutViewConstructor = new (...args: any[]) => LayoutViewMembers;

/**
 * Adds the layout transform to a pixi view class.
 *
 * `@pixi/react` passes a view's props to its constructor, and pixi assigns them during `super()`, before a subclass's
 * fields exist (and with `define` semantics a field declaration would reset them afterwards). So the state lives in a
 * lazily created object rather than in fields.
 */
export default function LayoutView<TBase extends ViewConstructor> (Base: TBase): TBase & LayoutViewConstructor {

  // Typed through `LayoutViewMembers` in the return type: declarations can't describe a class expression that
  // extends pixi's classes, whose private members an anonymous class type can't carry.
  return class LayoutView extends Base implements LayoutViewMembers {

    declare _layoutState: LayoutViewState | undefined;

    get _layout (): LayoutViewState {
      return this._layoutState ??= {
        box: new Rectangle(),
        x: 0,
        y: 0,
        translateX: 0,
        translateY: 0,
        originX: 0.5,
        originY: 0.5
      };
    }

    get layoutBox (): Rectangle {
      return this._layout.box;
    }

    get translateX () { return this._layout.translateX; }
    set translateX (value: number) { this._layout.translateX = value; this._applyLayoutPosition(); }

    get translateY () { return this._layout.translateY; }
    set translateY (value: number) { this._layout.translateY = value; this._applyLayoutPosition(); }

    get transformOriginX () { return this._layout.originX; }
    set transformOriginX (value: number) { this._layout.originX = value; this._applyLayoutOrigin(); }

    get transformOriginY () { return this._layout.originY; }
    set transformOriginY (value: number) { this._layout.originY = value; this._applyLayoutOrigin(); }

    get scaleX () { return this.scale.x; }
    set scaleX (value: number) { this.scale.x = value; }

    get scaleY () { return this.scale.y; }
    set scaleY (value: number) { this.scale.y = value; }

    get skewX () { return this.skew.x; }
    set skewX (value: number) { this.skew.x = value; }

    get skewY () { return this.skew.y; }
    set skewY (value: number) { this.skew.y = value; }

    applyLayout (x: number, y: number, width: number, height: number): void {
      const layout = this._layout;

      layout.x = x;
      layout.y = y;
      layout.box.width = width;
      layout.box.height = height;

      this._applyLayoutSize(width, height);
      this._applyLayoutPosition();
      this._applyLayoutOrigin();
    }

    _applyLayoutSize (_width: number, _height: number): void {
      // Overridden by sized views.
    }

    _applyLayoutPosition (): void {
      const { x, y, translateX, translateY } = this._layout;
      this.position.set(x + translateX, y + translateY);
    }

    _applyLayoutOrigin (): void {
      const { box, originX, originY } = this._layout;
      this.origin.set(box.width * originX, box.height * originY);
    }

  };

}
