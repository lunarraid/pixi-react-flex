import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { extend } from '@pixi/react';
import { Sprite } from 'pixi.js';
import { LayoutNode } from '../flex/Layout.jsx';
import getTextureFromProps from '../helpers/getTextureFromProps';
import { MeasureMode } from 'yoga-layout/load';

extend({ Sprite });

const FlexSprite = forwardRef(function FlexSprite (props, ref) {

  if (props.children) {
    throw new Error('Only containers allow children');
  }

  const layoutRef = useRef(null);
  const viewRef = useRef(null);

  useImperativeHandle(ref, () => viewRef.current, []);

  const texture = getTextureFromProps(props);

  const { onLayout } = props;

  const setLayout = useCallback((x, y, width, height) => {
    const s = viewRef.current;
    s.position.set(x, y);
    s.setSize(width, height);
    onLayout?.(x, y, width, height);
  }, [ onLayout ]);

  const measure = useCallback((width, widthMode, height, heightMode) => {

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
      <sprite { ...props } ref={ viewRef } texture={ texture } />
    </LayoutNode>
  );

});

export default FlexSprite;
