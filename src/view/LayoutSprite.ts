import { Sprite, type BoundsData, type Size } from 'pixi.js';
import LayoutView from './LayoutView';

/**
 * A sprite whose `width` and `height` are its geometry, like a nine-slice's, instead of a scale of its texture: the
 * texture is stretched over the size it is given, so `scale` is free for the transform. As in React Native, an image's
 * size comes from layout and its transform scales it on top.
 *
 * pixi draws a sprite's quad from `visualBounds` and hit tests, culls and measures it with `bounds`, both from the
 * texture's size; both are overridden to cover `width × height` instead, with a trimmed texture's trim scaled to match.
 * Until it is sized, the sprite keeps its texture's size, so it measures and draws as a plain sprite.
 */
export default class LayoutSprite extends LayoutView(Sprite) {

  declare _layoutWidth: number | undefined;
  declare _layoutHeight: number | undefined;
  declare _layoutVisualBounds: BoundsData | undefined;

  get layoutWidth (): number {
    return this._layoutWidth ?? this.texture.orig.width;
  }

  get layoutHeight (): number {
    return this._layoutHeight ?? this.texture.orig.height;
  }

  override setSize (value: number | { width: number, height?: number } | Size, height?: number): void {
    if (typeof value === 'object') {
      height = value.height ?? value.width;
      value = value.width;
    }

    this._layoutWidth = value;
    this._layoutHeight = height ?? value;
    this.onViewUpdate();
  }

  override get width (): number {
    return Math.abs(this.scale.x) * this.layoutWidth;
  }

  override set width (value: number) {
    this.setSize(value, this.layoutHeight);
  }

  override get height (): number {
    return Math.abs(this.scale.y) * this.layoutHeight;
  }

  override set height (value: number) {
    this.setSize(this.layoutWidth, value);
  }

  override _applyLayoutSize (width: number, height: number): void {
    this.setSize(width, height);
  }

  override get visualBounds (): BoundsData {
    const bounds = this._layoutVisualBounds ??= { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    const { orig, trim } = this.texture;
    const width = this.layoutWidth;
    const height = this.layoutHeight;
    const scaleX = orig.width ? width / orig.width : 1;
    const scaleY = orig.height ? height / orig.height : 1;
    const left = -this.anchor.x * width;
    const top = -this.anchor.y * height;

    if (trim) {
      bounds.minX = left + trim.x * scaleX;
      bounds.maxX = bounds.minX + trim.width * scaleX;
      bounds.minY = top + trim.y * scaleY;
      bounds.maxY = bounds.minY + trim.height * scaleY;
    } else {
      bounds.minX = left;
      bounds.maxX = left + width;
      bounds.minY = top;
      bounds.maxY = top + height;
    }

    return bounds;
  }

  protected override updateBounds (): void {
    const bounds = this._bounds;
    const width = this.layoutWidth;
    const height = this.layoutHeight;

    bounds.minX = -this.anchor.x * width;
    bounds.maxX = bounds.minX + width;
    bounds.minY = -this.anchor.y * height;
    bounds.maxY = bounds.minY + height;
  }

}
