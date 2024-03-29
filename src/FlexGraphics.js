import { PixiComponent } from '@pixi/react';
import { Graphics } from '@pixi/graphics';
import LayoutMixin from './LayoutMixin';
import { applyDefaultStyleProps } from './PropsUtils';

const FlexGraphics = LayoutMixin(Graphics);

export default PixiComponent('FlexGraphics', {

  create: (props) => {
    return props.geometry
      ? new FlexGraphics(props.geometry.geometry)
      : new FlexGraphics();
  },

  applyProps (instance, oldProps, newProps) {
    let changed = applyDefaultStyleProps(instance, oldProps, newProps);

    if (oldProps.draw !== newProps.draw && typeof newProps.draw === 'function')
    {
        changed = true;
        newProps.draw.call(instance, instance);
    }

    return changed;
  }

});
