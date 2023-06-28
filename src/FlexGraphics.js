import { PixiComponent } from '@pixi/react';
import { Graphics } from '@pixi/graphics';
import LayoutMixin from './LayoutMixin';
import { applyDefaultStyleProps } from './PropsUtils';

const FlexGraphics = LayoutMixin(Graphics);

export default PixiComponent('FlexGraphics', {

  create: (props) => {
    return new FlexGraphics();
  },

  applyProps: applyDefaultStyleProps

});
