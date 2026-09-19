import { TilingSprite } from 'pixi.js';
import { extend, PixiReactElementProps } from '@pixi/react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { LayoutNode, LayoutProps, NodeContext } from '../flex/Layout';
import getTextureFromProps from '../helpers/getTextureFromProps';
import LayoutView, { type LayoutTransformProps } from './LayoutView';

/** A tiling sprite with the layout transform; its `width` / `height` are its geometry, so it takes its box's size. */
export class LayoutTilingSprite extends LayoutView(TilingSprite) {

  override _applyLayoutSize (width: number, height: number): void {
    this.setSize(width, height);
  }

}

extend({ LayoutTilingSprite });

declare module '@pixi/react' {
  interface PixiElements {
    pixiLayoutTilingSprite: PixiReactElementProps<typeof LayoutTilingSprite>;
  }
}

// Typed from pixi's `TilingSprite`: its constructor overloads don't survive the mixin for `PixiReactElementProps`.
export type TilingSpriteProps = PixiReactElementProps<typeof TilingSprite> & LayoutTransformProps & LayoutProps;

const FlexTilingSprite = forwardRef(function FlexTilingSprite (props: TilingSpriteProps, ref) {

  const viewRef = useRef<LayoutTilingSprite>(null!);
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
    viewRef.current.applyLayout(x, y, width, height);
    onLayout?.(x, y, width, height);
  }, [ onLayout ]);

  return (
    <LayoutNode ref={ layoutRef } style={ style } onLayout={ setLayout }>
      {/* @ts-ignore */}
      <pixiLayoutTilingSprite { ...pixiProps } ref={ viewRef } texture={ texture } />
    </LayoutNode>
  );

});

FlexTilingSprite.displayName = 'TilingSprite';

export default FlexTilingSprite;
