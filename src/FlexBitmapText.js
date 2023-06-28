import { PixiComponent } from '@pixi/react';
import { BitmapText, BitmapFont } from '@pixi/text-bitmap';
import LayoutMixin from './LayoutMixin';
import { applyDefaultStyleProps } from './PropsUtils';

const textStyleKeys = [ 'align', 'fontName', 'fontSize', 'letterSpacing', 'maxWidth' ];
const keyCache = {};

let _defaultFont = null;

function getDefaultFont () {
  if (!_defaultFont) {
    _defaultFont = BitmapFont.from('Arial', {
      fill: '#ffffff',
      fontFamily: 'Arial',
      fontSize: 12
    }, { chars: BitmapFont.ASCII });
  }

  return 'Arial';
}

class FlexBitmapText extends LayoutMixin(BitmapText) {

  sizeData = { width: 0, height: 0 };

  measure (node, width, widthMode, height, heightMode) {
    const previousMaxWidth = this.maxWidth;
    this.maxWidth = width;
    this.sizeData.width = this.textWidth;
    this.sizeData.height = this.textHeight;
    this.maxWidth = previousMaxWidth;
    return this.sizeData;
  }

  _onLayout (x, y, width, height) {
    this.maxWidth = width;
  }

}

export default PixiComponent('FlexBitmapText', {

  create: (props) => {
    return new FlexBitmapText('', { fontName: props.style?.fontName || props.fontName || getDefaultFont() });
  },

  applyProps: (instance, oldProps, newProps) => {
    let style = instance.layoutStyle;

    for (const key of textStyleKeys) {
      keyCache[key] = style[key];
    }

    const result = applyDefaultStyleProps(instance, oldProps, newProps);

    style = instance.layoutStyle;

    let needsUpdate = false;

    for (const key of textStyleKeys) {
      const oldValue = keyCache[key];
      const newValue = style[key];

      if (oldValue !== newValue && newValue !== undefined) {
        needsUpdate = true;
        instance[key] = newValue;
      }
    }

    if (needsUpdate && instance._isMeasureFunctionSet) {
      instance.layoutNode.markDirty();
    }

    return result || needsUpdate;
  }

});
