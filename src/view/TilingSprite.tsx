import { TilingSprite } from 'pixi.js';
import { extend, PixiReactElementProps } from '@pixi/react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { LayoutNode, LayoutProps, NodeContext } from '../flex/Layout';
import getTextureFromProps from '../helpers/getTextureFromProps';

extend({ TilingSprite });

export type TilingSpriteProps = PixiReactElementProps<typeof TilingSprite> & LayoutProps;

const FlexTilingSprite = forwardRef(function FlexTilingSprite (props: TilingSpriteProps, ref) {

  const viewRef = useRef<TilingSprite>(null!);
  const layoutRef = useRef<NodeContext>(null!);

  useImperativeHandle(ref, () => ({ view: viewRef.current, layout: layoutRef.current }), []);

  const texture = getTextureFromProps(props);

  const {
    style,
    onLayout,
    measure: _measure,
    image: _image,
    ...pixiProps
  } = props as TilingSpriteProps & { image?: string };

  const setLayout = useCallback((x: number, y: number, width: number, height: number) => {
    const view = viewRef.current;
    view.position.set(x, y);
    view.width = width;
    view.height = height;
    onLayout?.(x, y, width, height);
  }, [ onLayout ]);

  return (
    <LayoutNode ref={ layoutRef } style={ style } onLayout={ setLayout }>
      {/* @ts-ignore */}
      <pixiTilingSprite { ...pixiProps } ref={ viewRef } texture={ texture } />
    </LayoutNode>
  );

});

FlexTilingSprite.displayName = 'TilingSprite';

export default FlexTilingSprite;
