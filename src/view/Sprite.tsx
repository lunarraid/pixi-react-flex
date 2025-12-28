import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { extend, PixiReactElementProps } from '@pixi/react';
import { Sprite } from 'pixi.js';
import { LayoutNode, LayoutProps } from '../flex/Layout.js';
import getTextureFromProps from '../helpers/getTextureFromProps.js';
import { MeasureMode } from 'yoga-layout/load';

extend({ Sprite });

export type SpriteProps = PixiReactElementProps<typeof Sprite> & LayoutProps;

const FlexSprite = forwardRef(function FlexSprite (props: SpriteProps, ref) {

  if (props.children) {
    throw new Error('Only containers allow children');
  }

  const layoutRef = useRef(null);
  const viewRef = useRef(null);

  useImperativeHandle(ref, () => ({ view: viewRef.current, layout: layoutRef.current }), []);

  const texture = getTextureFromProps(props);

  const { onLayout } = props;

  const setLayout = useCallback((x: number, y: number, width: number, height: number) => {
    const s = viewRef.current;
    s.position.set(x, y);
    s.setSize(width, height);
    onLayout?.(x, y, width, height);
  }, [ onLayout ]);

  const measure = useCallback((width: number, widthMode: MeasureMode, height: number, heightMode: MeasureMode) => {

    if (!texture.orig || texture.orig.width === 0 || texture.orig.height === 0) {
      return { width: 0, height: 0 };
    }

    let calculatedWidth = texture.orig.width;
    let calculatedHeight = texture.orig.height;

    const scale = calculatedWidth / calculatedHeight;

    if (widthMode === MeasureMode.AtMost) {
      calculatedWidth = width > calculatedWidth ? calculatedWidth : width;
      calculatedHeight = calculatedWidth / scale;
    }

    if (heightMode === MeasureMode.AtMost) {
      calculatedHeight = height > calculatedHeight ? calculatedHeight : height;
      calculatedWidth = calculatedHeight * scale;
    }

    if (widthMode === MeasureMode.Exactly) {
      calculatedWidth = width;
      calculatedHeight = heightMode !== MeasureMode.Exactly ? calculatedWidth / scale : height;
    }

    if (heightMode === MeasureMode.Exactly) {
      calculatedHeight = height;
      calculatedWidth = widthMode !== MeasureMode.Exactly ? calculatedHeight * scale : width;
    }

    return { width: calculatedWidth, height: calculatedHeight };

  }, [ texture ]);

  useLayoutEffect(() => {
    layoutRef.current.node.markDirty();
  }, [ texture ]);

  return (
    <LayoutNode ref={ layoutRef } style={ props.style } measure={ measure } onLayout={ setLayout }>
      <pixiSprite { ...props } ref={ viewRef } texture={ texture } />
    </LayoutNode>
  );

});

FlexSprite.displayName = 'Sprite';

export default FlexSprite;
