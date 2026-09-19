import { BitmapFontManager, BitmapText, CanvasTextMetrics, type Container, HTMLText, HTMLTextStyle, measureHtmlText, Text, TextStyle } from 'pixi.js';
import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { extend, PixiReactElementProps } from '@pixi/react';
import { LayoutNode, LayoutProps, NodeContext } from '../flex/Layout';
import LayoutView, { type LayoutTransformProps, type LayoutViewMembers } from './LayoutView';
import { Style } from '../flex/applyLayoutProperties';

type AnyTextStyle = TextStyle | HTMLTextStyle;
type AnyText = (Text | HTMLText | BitmapText) & LayoutViewMembers;

/** The size a canvas or bitmap text lays out at: what its layout node measures, and what `align` places it by. */
function measureLayoutText (bitmap: boolean, text: string, style: TextStyle): { width: number, height: number } {
  if (bitmap) {
    const { width, height, scale } = BitmapFontManager.measureText(text, style);
    return { width: width * scale, height: height * scale };
  }

  const { width, height } = CanvasTextMetrics.measureText(text, style);
  return { width, height };
}

/** How far across the spare width of its box each `align` places a text. */
const ALIGN_FRACTION: Partial<Record<string, number>> = { center: 0.5, right: 1 };

/** The members of a canvas or bitmap text view that alignment uses (their shared pixi base class is abstract). */
type TextView = Container & LayoutViewMembers & { text: string, style: TextStyle, onViewUpdate (): void };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TextViewConstructor = new (...args: any[]) => TextView;

/**
 * Aligns canvas and bitmap text within its layout box, as React Native and CSS do. pixi aligns a text's lines only
 * against its widest line, so a text in a box wider than that (stretched by its parent, say) was drawn at the box's
 * left edge whatever its `align`. HTML text lays out in a box of its wrap width and needs no help.
 *
 * The offset follows the text and its style too (both call `onViewUpdate`), since those can change without a new layout.
 */
function AlignedText<TBase extends TextViewConstructor> (Base: TBase): TBase {

  return class AlignedText extends Base {

    _alignOffset (): number {
      // pixi's constructor assigns the text and any transform props, which place the view, before it sets the style.
      if (!this.style) {
        return 0;
      }

      const fraction = ALIGN_FRACTION[this.style.align] ?? 0;

      if (!fraction) {
        return 0;
      }

      return (this.layoutBox.width - measureLayoutText(this instanceof BitmapText, this.text, this.style).width) * fraction;
    }

    override _applyLayoutPosition (): void {
      super._applyLayoutPosition();
      this.x += this._alignOffset();
    }

    override _applyLayoutOrigin (): void {
      super._applyLayoutOrigin();
      // The origin is in the view's own coordinates, which the offset has moved away from the box.
      this.origin.x -= this._alignOffset();
    }

    override onViewUpdate (): void {
      super.onViewUpdate();
      this._applyLayoutPosition();
      this._applyLayoutOrigin();
    }

  };

}

/** Text views with the layout transform; sized by their text, so layout doesn't size them. */
export class LayoutText extends AlignedText(LayoutView(Text)) {}
export class LayoutBitmapText extends AlignedText(LayoutView(BitmapText)) {}
export class LayoutHTMLText extends LayoutView(HTMLText) {}

extend({ LayoutBitmapText, LayoutHTMLText, LayoutText });

declare module '@pixi/react' {
  interface PixiElements {
    pixiLayoutText: PixiReactElementProps<typeof LayoutText>;
    pixiLayoutBitmapText: PixiReactElementProps<typeof LayoutBitmapText>;
    pixiLayoutHTMLText: PixiReactElementProps<typeof LayoutHTMLText>;
  }
}

const textStyleKeys = Object.keys(TextStyle.defaultTextStyle);

textStyleKeys.push('cssOverrides', 'tagStyles');

export type AbstractTextStyle = Style & Partial<HTMLTextStyle>;

const NO_STYLE = {} as AbstractTextStyle;

export type AbstractTextProps = PixiReactElementProps<typeof Text> & LayoutTransformProps & LayoutProps & {
  View?: 'pixiLayoutText' | 'pixiLayoutBitmapText' | 'pixiLayoutHTMLText',
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
    View = 'pixiLayoutText',
    onLayout,
    style = NO_STYLE,
    text,
    measure: _measure,
    ...pixiProps
  } = props;

  const wantsHtml = View === 'pixiLayoutHTMLText';
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

      case 'pixiLayoutBitmapText':
        return measureLayoutText(true, textValue, currentTextStyle as TextStyle);

      case 'pixiLayoutHTMLText':
      {
        const { width, height } = measureHtmlText(textValue, currentTextStyle as HTMLTextStyle);
        return { width, height };
      }

      case 'pixiLayoutText':
        return measureLayoutText(false, textValue, currentTextStyle as TextStyle);

      default: throw new Error('Unknown View Type');

    }

  }, [ View, hasManualWordWrapWidth, textValue ]);

  const setLayout = useCallback((x: number, y: number, width: number, height: number) => {

    const b = viewRef.current;

    b.applyLayout(x, y, width, height);

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
