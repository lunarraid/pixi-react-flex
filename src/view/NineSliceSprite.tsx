import { NineSliceSprite } from 'pixi.js';
import { extend, PixiReactElementProps } from '@pixi/react';
import { forwardRef, useCallback, useLayoutEffect, useImperativeHandle, useRef } from 'react';
import { LayoutNode, LayoutProps } from '../flex/Layout.js';
import getTextureFromProps from '../helpers/getTextureFromProps.js';

extend({ NineSliceSprite });

export type NineSliceSpriteProps = PixiReactElementProps<typeof NineSliceSprite> & LayoutProps;

const FlexNineSliceSprite = forwardRef(function FlexNineSliceSprite (props: NineSliceSpriteProps, ref) {

  if (props.children) {
    throw new Error('Only containers allow children');
  }

  const viewRef = useRef(null);

  useImperativeHandle(ref, () => viewRef.current, []);

  const { onLayout, style = {} } = props;

  const setLayout = useCallback((x: number, y: number, width: number, height: number) => {
    const view = viewRef.current;
    view.position.set(x, y);
    view.width = width;
    view.height = height;
    onLayout?.(x, y, width, height);
  }, [ onLayout ]);

  const texture = getTextureFromProps(props);

  const {
    bottomHeight = texture.height * 0.5,
    rightWidth = texture.width * 0.5,
    topHeight = texture.height * 0.5,
    leftWidth = texture.width * 0.5
  } = style;

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
    <LayoutNode style={ props.style } onLayout={ setLayout }>
      <pixiNineSliceSprite { ...props } ref={ viewRef } texture={ texture } />
    </LayoutNode>
  );

});

export default FlexNineSliceSprite;
