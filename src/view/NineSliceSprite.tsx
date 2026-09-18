import { NineSliceSprite } from 'pixi.js';
import { extend, PixiReactElementProps } from '@pixi/react';
import { forwardRef, useCallback, useLayoutEffect, useImperativeHandle, useRef } from 'react';
import { LayoutNode, LayoutProps, NodeContext } from '../flex/Layout';
import getTextureFromProps from '../helpers/getTextureFromProps';

extend({ NineSliceSprite });

export type NineSliceSpriteProps = PixiReactElementProps<typeof NineSliceSprite> & LayoutProps;

const FlexNineSliceSprite = forwardRef(function FlexNineSliceSprite (props: NineSliceSpriteProps, ref) {

  if (props.children) {
    throw new Error('Only containers allow children');
  }

  const viewRef = useRef<NineSliceSprite>(null!);
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
    const view = viewRef.current;
    view.position.set(x, y);
    view.width = width;
    view.height = height;
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
    <LayoutNode ref={ layoutRef } style={ style } onLayout={ setLayout }>
      <pixiNineSliceSprite { ...pixiProps } ref={ viewRef } texture={ texture } />
    </LayoutNode>
  );

});

FlexNineSliceSprite.displayName = 'NineSliceSprite';

export default FlexNineSliceSprite;
