import { PixiComponent } from '@pixi/react';
import { Point } from '@pixi/core';
import { Container } from '@pixi/display';
import LayoutMixin from './LayoutMixin';
import { applyDefaultStyleProps } from './PropsUtils';

const SCRATCH_POINT = new Point();

class FlexContainer extends LayoutMixin(Container) {

  _width = 0;
  _height = 0;

  _calculateBounds () {
    const b = this._bounds;
    b.minX = 0;
    b.maxX = this._width;
    b.minY = 0;
    b.maxY = this._height;
  }

  containsPoint (point) {
    this.worldTransform.applyInverse(point, SCRATCH_POINT);

    const width = this._width;
    const height = this._height;

    return SCRATCH_POINT.x >= 0
      && SCRATCH_POINT.x < width
      && SCRATCH_POINT.y >= 0
      && SCRATCH_POINT.y < height;
  }

  _onLayout (x, y, width, height) {
    this.height = height;
    this.width = width;
  }

  get height () {
    return this._height;
  }

  set height (value) {
    this._height = value;
  }

  get width () {
    return this._width;
  }

  set width (value) {
    this._width = value;
  }

}

export default PixiComponent('FlexContainer', {

  create: (props) => {
    return new FlexContainer();
  },

  applyProps: applyDefaultStyleProps

});
