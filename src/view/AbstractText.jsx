import { BitmapFontManager, BitmapText, CanvasTextMetrics, HTMLText, HTMLTextStyle, measureHtmlText, Text, TextStyle } from 'pixi.js';
import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { extend } from '@pixi/react';
import { LayoutNode } from '../flex/Layout.jsx';

extend({ BitmapText, HTMLText, Text });

const textStyleKeys = Object.keys(TextStyle.defaultTextStyle);

textStyleKeys.push('cssOverrides', 'tagStyles');

const NO_STYLE = {};

const AbstractText = forwardRef(function AbstractText (props, ref) {

  if (props.children) {
    throw new Error('Only containers allow children');
  }

  const dts = TextStyle.defaultTextStyle;

  const viewRef = useRef(null);
  const layoutRef = useRef(null);
  const textStyleRef = useRef(null);

  useImperativeHandle(ref, () => viewRef.current, []);

  const { View = 'text', onLayout, style = NO_STYLE, text } = props;

  if (!textStyleRef.current) {
    textStyleRef.current = View === 'pixiHTMLText' ? new HTMLTextStyle() : new TextStyle();
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

  const measure = useCallback((layoutWidth) => {

    const currentTextStyle = textStyleRef.current;

    if (currentTextStyle.wordWrap && !hasManualWordWrapWidth) {
      currentTextStyle.wordWrapWidth = layoutWidth;
    }

    switch (View) {

      case 'bitmapText':
      {
        const { width, height, scale } = BitmapFontManager.measureText(text, currentTextStyle);
        return { width: width * scale, height: height * scale };
      }

      case 'pixiHTMLText':
      {
        const { width, height } = measureHtmlText(text, currentTextStyle);
        return { width, height };
      }

      case 'text':
      {
        const { width, height } = CanvasTextMetrics.measureText(text, currentTextStyle);
        return { width, height };
      }

      default: throw new Error('Unknown View Type');

    }

  }, [ View, hasManualWordWrapWidth, text ]);

  const setLayout = useCallback((x, y, width, height) => {

    const b = viewRef.current;

    b.position.set(x, y);

    if (!hasManualWordWrapWidth) {
      b.style.wordWrapWidth = width;
    }

    onLayout?.(x, y, width, height);

  }, [ hasManualWordWrapWidth, onLayout ]);

  return (
    <LayoutNode measure={ measure } ref={ layoutRef } style={ props.style } onLayout={ setLayout }>
      <View ref={ viewRef } { ...props } style={ textStyleRef.current } />
    </LayoutNode>
  );
});

export default AbstractText;
