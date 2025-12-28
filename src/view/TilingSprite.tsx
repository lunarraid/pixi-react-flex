import { TilingSprite } from 'pixi.js';
import { extend, PixiReactElementProps } from '@pixi/react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { LayoutNode, LayoutProps } from '../flex/Layout.js';
import getTextureFromProps from '../helpers/getTextureFromProps.js';

extend({ TilingSprite });

export type TilingSpriteProps = PixiReactElementProps & LayoutProps;

const FlexTilingSprite = forwardRef(function FlexTilingSprite (props: TilingSpriteProps, ref) {

  const viewRef = useRef(null);

  useImperativeHandle(ref, () => viewRef.current, []);

  const texture = getTextureFromProps(props);

  const { onLayout } = props;

  const setLayout = useCallback((x: number, y: number, width: number, height: number) => {
    const view = viewRef.current;
    view.position.set(x, y);
    view.width = width;
    view.height = height;
    onLayout?.(x, y, width, height);
  }, [ onLayout ]);

  return (
    <LayoutNode style={ props.style } onLayout={ setLayout }>
      {/* @ts-ignore */}
      <pixiTilingSprite { ...props } ref={ viewRef } texture={ texture } />
    </LayoutNode>
  );

});

FlexTilingSprite.displayName = 'TilingSprite';

export default FlexTilingSprite;
