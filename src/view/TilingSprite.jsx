import { TilingSprite } from 'pixi.js';
import { extend } from '@pixi/react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { LayoutNode } from '../flex/Layout.jsx';
import getTextureFromProps from '../helpers/getTextureFromProps';

extend({ TilingSprite });

const FlexTilingSprite = forwardRef(function FlexTilingSprite (props, ref) {

  if (props.children) {
    throw new Error('Only containers allow children');
  }

  const viewRef = useRef(null);

  useImperativeHandle(ref, () => viewRef.current, []);

  const texture = getTextureFromProps(props);

  const { onLayout } = props;

  const setLayout = useCallback((x, y, width, height) => {
    const view = viewRef.current;
    view.position.set(x, y);
    view.width = width;
    view.height = height;
    onLayout?.(x, y, width, height);
  }, [ onLayout ]);

  return (
    <LayoutNode style={ props.style } onLayout={ setLayout }>
      <pixiTilingSprite { ...props } ref={ viewRef } texture={ texture } />
    </LayoutNode>
  );

});

export default FlexTilingSprite;
