import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { extend, PixiReactElementProps } from '@pixi/react';
import { LayoutNodeBase, LayoutProps, NodeContext } from '../flex/Layout';
import getTextureFromProps from '../helpers/getTextureFromProps';
import LayoutSprite from './LayoutSprite';
import type { LayoutTransformProps } from './LayoutView';
import { MeasureMode } from 'yoga-layout/load';

extend({ LayoutSprite });

declare module '@pixi/react' {
  interface PixiElements {
    pixiLayoutSprite: PixiReactElementProps<typeof LayoutSprite>;
  }
}

export type SpriteProps = PixiReactElementProps<typeof LayoutSprite> & LayoutTransformProps & LayoutProps;

const FlexSprite = forwardRef(function FlexSprite (props: SpriteProps, ref) {

  if (props.children) {
    throw new Error('Only containers allow children');
  }

  const layoutRef = useRef<NodeContext>(null!);
  const viewRef = useRef<LayoutSprite>(null!);

  useImperativeHandle(ref, () => ({ view: viewRef.current, layout: layoutRef.current }), []);

  const texture = getTextureFromProps(props);

  const { style, onLayout, measure: _measure, image: _image, ...pixiProps } = props as SpriteProps & { image?: string };

  const setLayout = useCallback((x: number, y: number, width: number, height: number) => {
    viewRef.current.applyLayout(x, y, width, height);
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
    <LayoutNodeBase viewRef={ viewRef } ref={ layoutRef } style={ style } measure={ measure } onLayout={ setLayout }>
      <pixiLayoutSprite { ...pixiProps } ref={ viewRef } texture={ texture } />
    </LayoutNodeBase>
  );

});

FlexSprite.displayName = 'Sprite';

export default FlexSprite;
