import { PixiComponent } from '@pixi/react';
import { Text, TextMetrics, TextStyle } from '@pixi/text';
import LayoutMixin from './LayoutMixin';
import { applyDefaultStyleProps } from './PropsUtils';

const textStyleKeys = {
  align: true,
  breakWords: true,
  dropShadow: true,
  dropShadowAlpha: true,
  dropShadowAngle: true,
  dropShadowBlur: true,
  dropShadowColor: true,
  dropShadowDistance: true,
  fill: true,
  fillGradientType: true,
  fillGradientStops: true,
  fontFamily: true,
  fontSize: true,
  fontStyle: true,
  fontVariant: true,
  fontWeight: true,
  letterSpacing: true,
  lineHeight: true,
  lineJoin: true,
  miterLimit: true,
  padding: true,
  stroke: true,
  strokeThickness: true,
  textBaseline: true,
  trim: true,
  whiteSpace: true,
  wordWrap: true,
  wordWrapWidth: true,
  leading: true
};

class FlexText extends LayoutMixin(Text) {

  sizeData = { width: 0, height: 0 };

  measure (node, width, widthMode, height, heightMode) {
    const { text, style } = this;
    const previousWordWrapWidth = style.wordWrapWidth;
    style.wordWrapWidth = width;
    const metrics = TextMetrics.measureText(text, style);
    style.wordWrapWidth = previousWordWrapWidth;

    this.sizeData.width = metrics.width;
    this.sizeData.height = metrics.height;

    return this.sizeData;
  }

  _onLayout (x, y, width, height) {
    this.style.wordWrapWidth = width;
    this.dirty = true;
  }

}

export default PixiComponent('FlexText', {

  create: (props) => {
    return new FlexText(new TextStyle());
  },

  applyProps: (instance, oldProps, newProps) => {
    let result = applyDefaultStyleProps(instance, oldProps, newProps);

    const { layoutStyle, style } = instance;

    for (const key in layoutStyle) {
      if (textStyleKeys[key]) {
        const oldValue = style[key];
        style[key] = layoutStyle[key];
        if (style[key] !== oldValue) {
          instance.localStyleID = -1;
          instance.dirty = true;
          result = true;
        }
      }
    }

    if (result) {
      instance.layoutNode.markDirty();
    }

    return result;
  }

});
