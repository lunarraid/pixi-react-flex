import { BitmapFontManager, BitmapText, CanvasTextMetrics, HTMLText, HTMLTextStyle, measureHtmlText, Text, TextStyle } from 'pixi.js';
import { forwardRef, RefObject, useCallback, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { extend, PixiReactElementProps } from '@pixi/react';
import { LayoutNode, LayoutProps } from '../flex/Layout.js';
import { Style } from '../flex/applyLayoutProperties.js';

extend({ BitmapText, HTMLText, Text });

const textStyleKeys = Object.keys(TextStyle.defaultTextStyle);

textStyleKeys.push('cssOverrides', 'tagStyles');

export type AbstractTextStyle = Style & Partial<HTMLTextStyle>;

const NO_STYLE = {} as AbstractTextStyle;

export type AbstractTextProps = PixiReactElementProps & LayoutProps & {
  View?: 'pixiText' | 'pixiBitmapText' | 'pixiHtmlText',
  text?: string,
  style?: AbstractTextStyle
};

const AbstractText = forwardRef(function AbstractText (props: AbstractTextProps, ref) {

  if (props.children) {
    throw new Error('Only containers allow children');
  }

  const dts = TextStyle.defaultTextStyle;

  const viewRef: RefObject<any> = useRef(null);
  const layoutRef = useRef(null);
  const textStyleRef: RefObject<TextStyle | HTMLTextStyle> = useRef(null);

  useImperativeHandle(ref, () => ({ view: viewRef.current, layout: layoutRef.current }), []);

  const { View = 'pixiText', onLayout, style = NO_STYLE, text } = props;

  if (!textStyleRef.current) {
    textStyleRef.current = View === 'pixiHtmlText' ? new HTMLTextStyle() : new TextStyle();
  }

  const hasManualWordWrapWidth = style?.wordWrapWidth !== undefined;

  for (const key of textStyleKeys) {

    if (!hasManualWordWrapWidth && key === 'wordWrapWidth') {
      continue;
    }

    const value = style[key] !== undefined ? style[key] : dts[key];

    if (textStyleRef.current[key] !== value) {
      textStyleRef.current[key] = value;
    }
  }


  const { styleKey } = textStyleRef.current;

  useLayoutEffect(() => {
    layoutRef.current.node.markDirty();
  }, [ styleKey, text ]);

  const measure = useCallback((layoutWidth: number) => {

    const currentTextStyle = textStyleRef.current;

    if (currentTextStyle.wordWrap && !hasManualWordWrapWidth) {
      currentTextStyle.wordWrapWidth = layoutWidth;
    }

    switch (View) {

      case 'pixiBitmapText':
      {
        const { width, height, scale } = BitmapFontManager.measureText(text, currentTextStyle);
        return { width: width * scale, height: height * scale };
      }

      case 'pixiHtmlText':
      {
        const { width, height } = measureHtmlText(text, currentTextStyle as HTMLTextStyle);
        return { width, height };
      }

      case 'pixiText':
      {
        const { width, height } = CanvasTextMetrics.measureText(text, currentTextStyle);
        return { width, height };
      }

      default: throw new Error('Unknown View Type');

    }

  }, [ View, hasManualWordWrapWidth, text ]);

  const setLayout = useCallback((x: number, y: number, width: number, height: number) => {

    const b = viewRef.current;

    b.position.set(x, y);

    if (!hasManualWordWrapWidth) {
      b.style.wordWrapWidth = width;
    }

    onLayout?.(x, y, width, height);

  }, [ hasManualWordWrapWidth, onLayout ]);

  return (
    <LayoutNode measure={ measure } ref={ layoutRef } style={ props.style } onLayout={ setLayout }>
      {/* @ts-ignore */}
      <View ref={ viewRef } { ...props } style={ textStyleRef.current } />
    </LayoutNode>
  );
});

export default AbstractText;
