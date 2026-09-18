import { BitmapFontManager, BitmapText, CanvasTextMetrics, HTMLText, HTMLTextStyle, measureHtmlText, Text, TextStyle } from 'pixi.js';
import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { extend, PixiReactElementProps } from '@pixi/react';
import { LayoutNode, LayoutProps, NodeContext } from '../flex/Layout';
import { Style } from '../flex/applyLayoutProperties';

type AnyTextStyle = TextStyle | HTMLTextStyle;
type AnyText = Text | HTMLText | BitmapText;

extend({ BitmapText, HTMLText, Text });

const textStyleKeys = Object.keys(TextStyle.defaultTextStyle);

textStyleKeys.push('cssOverrides', 'tagStyles');

export type AbstractTextStyle = Style & Partial<HTMLTextStyle>;

const NO_STYLE = {} as AbstractTextStyle;

export type AbstractTextProps = PixiReactElementProps<typeof Text> & LayoutProps & {
  View?: 'pixiText' | 'pixiBitmapText' | 'pixiHtmlText',
  text?: string,
  style?: AbstractTextStyle
};

const AbstractText = forwardRef(function AbstractText (props: AbstractTextProps, ref) {

  if (props.children) {
    throw new Error('Only containers allow children');
  }

  const dts = TextStyle.defaultTextStyle;

  const viewRef = useRef<AnyText>(null!);
  const layoutRef = useRef<NodeContext>(null!);
  const textStyleRef = useRef<AnyTextStyle | null>(null);

  useImperativeHandle(ref, () => ({ view: viewRef.current, layout: layoutRef.current }), []);

  const {
    View = 'pixiText',
    onLayout,
    style = NO_STYLE,
    text,
    measure: _measure,
    ...pixiProps
  } = props;

  const wantsHtml = View === 'pixiHtmlText';
  const isHtml = textStyleRef.current instanceof HTMLTextStyle;

  if (!textStyleRef.current || wantsHtml !== isHtml) {
    textStyleRef.current = wantsHtml ? new HTMLTextStyle() : new TextStyle();
  }

  const textStyle = textStyleRef.current as AnyTextStyle & Record<string, unknown>;
  const styleRecord = style as unknown as Record<string, unknown>;
  const dtsRecord = dts as unknown as Record<string, unknown>;

  const hasManualWordWrapWidth = style?.wordWrapWidth !== undefined;

  for (const key of textStyleKeys) {

    if (!hasManualWordWrapWidth && key === 'wordWrapWidth') {
      continue;
    }

    const value = styleRecord[key] !== undefined ? styleRecord[key] : dtsRecord[key];

    if (textStyle[key] !== value) {
      textStyle[key] = value;
    }
  }


  const { styleKey } = textStyle;

  useLayoutEffect(() => {
    layoutRef.current.node.markDirty();
  }, [ styleKey, text ]);

  const textValue = text ?? '';

  const measure = useCallback((layoutWidth: number) => {

    const currentTextStyle = textStyleRef.current!;

    if (currentTextStyle.wordWrap && !hasManualWordWrapWidth) {
      currentTextStyle.wordWrapWidth = layoutWidth;
    }

    switch (View) {

      case 'pixiBitmapText':
      {
        const { width, height, scale } = BitmapFontManager.measureText(textValue, currentTextStyle);
        return { width: width * scale, height: height * scale };
      }

      case 'pixiHtmlText':
      {
        const { width, height } = measureHtmlText(textValue, currentTextStyle as HTMLTextStyle);
        return { width, height };
      }

      case 'pixiText':
      {
        const { width, height } = CanvasTextMetrics.measureText(textValue, currentTextStyle);
        return { width, height };
      }

      default: throw new Error('Unknown View Type');

    }

  }, [ View, hasManualWordWrapWidth, textValue ]);

  const setLayout = useCallback((x: number, y: number, width: number, height: number) => {

    const b = viewRef.current;

    b.position.set(x, y);

    if (!hasManualWordWrapWidth) {
      b.style.wordWrapWidth = width;
    }

    onLayout?.(x, y, width, height);

  }, [ hasManualWordWrapWidth, onLayout ]);

  return (
    <LayoutNode measure={ measure } ref={ layoutRef } style={ style } onLayout={ setLayout }>
      {/* @ts-ignore */}
      <View ref={ viewRef } { ...pixiProps } text={ text } style={ textStyleRef.current } />
    </LayoutNode>
  );
});

export default AbstractText;
