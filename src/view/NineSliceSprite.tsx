import { NineSliceSprite } from 'pixi.js';
import { extend, PixiReactElementProps } from '@pixi/react';
import { forwardRef, useCallback, useLayoutEffect, useImperativeHandle, useRef } from 'react';
import { LayoutNodeBase, LayoutProps, NodeContext } from '../flex/Layout';
import getTextureFromProps from '../helpers/getTextureFromProps';
import LayoutView, { type LayoutTransformProps } from './LayoutView';

/** A nine-slice with the layout transform; its `width` / `height` are its geometry, so it takes its box's size. */
export class LayoutNineSliceSprite extends LayoutView(NineSliceSprite) {

  override _applyLayoutSize (width: number, height: number): void {
    this.setSize(width, height);
  }

}

extend({ LayoutNineSliceSprite });

declare module '@pixi/react' {
  interface PixiElements {
    pixiLayoutNineSliceSprite: PixiReactElementProps<typeof LayoutNineSliceSprite>;
  }
}

export type NineSliceSpriteProps = PixiReactElementProps<typeof LayoutNineSliceSprite> & LayoutTransformProps & LayoutProps;

const FlexNineSliceSprite = forwardRef(function FlexNineSliceSprite (props: NineSliceSpriteProps, ref) {

  if (props.children) {
    throw new Error('Only containers allow children');
  }

  const viewRef = useRef<LayoutNineSliceSprite>(null!);
  const layoutRef = useRef<NodeContext>(null!);

  useImperativeHandle(ref, () => ({ view: viewRef.current, layout: layoutRef.current }), []);

  const {
    onLayout,
    style = {},
    measure: _measure,
    image: _image,
    ...pixiProps
  } = props as NineSliceSpriteProps & { image?: string };

  const setLayout = useCallback((x: number, y: number, width: number, height: number) => {
    viewRef.current.applyLayout(x, y, width, height);
    onLayout?.(x, y, width, height);
  }, [ onLayout ]);

  const texture = getTextureFromProps(props);

  const sliceStyle = style as {
    bottomHeight?: number,
    rightWidth?: number,
    topHeight?: number,
    leftWidth?: number
  };

  const {
    bottomHeight = texture.height * 0.5,
    rightWidth = texture.width * 0.5,
    topHeight = texture.height * 0.5,
    leftWidth = texture.width * 0.5
  } = sliceStyle;

  useLayoutEffect(() => {

    if (!texture) {
      return;
    }

    const view = viewRef.current;

    if (view.bottomHeight !== bottomHeight) {
      view.bottomHeight = bottomHeight;
    }

    if (view.rightWidth !== rightWidth) {
      view.rightWidth = rightWidth;
    }

    if (view.topHeight !== topHeight) {
      view.topHeight = topHeight;
    }

    if (view.leftWidth !== leftWidth) {
      view.leftWidth = leftWidth;
    }

  }, [ texture, bottomHeight, rightWidth, topHeight, leftWidth ]);

  return (
    <LayoutNodeBase viewRef={ viewRef } ref={ layoutRef } style={ style } onLayout={ setLayout }>
      <pixiLayoutNineSliceSprite { ...pixiProps } ref={ viewRef } texture={ texture } />
    </LayoutNodeBase>
  );

});

FlexNineSliceSprite.displayName = 'NineSliceSprite';

export default FlexNineSliceSprite;
