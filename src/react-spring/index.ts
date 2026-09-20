import { createHost } from '@react-spring/animated';
import type { Lookup } from '@react-spring/types';
import { BitmapText, Container, Graphics, HTMLText, LAYOUT_KEYS, NineSliceSprite, setTextStyleValue, Sprite, Text, TilingSprite } from '..';
import { applyProps } from '@pixi/react';
import type { NodeContext } from '../flex/Layout';
import type { Style } from '../flex/applyLayoutProperties';

const PRIMITIVES = [
  BitmapText,
  Container,
  Graphics,
  HTMLText,
  NineSliceSprite,
  Sprite,
  Text,
  TilingSprite
];

type PixiReactView = NonNullable<Parameters<typeof applyProps>[0]>;

type AnimatedHostNode = { view: PixiReactView, layout: NodeContext };

/**
 * Layout keys an animated component takes as props of their own, so they can be springs: they are laid out as part of
 * its style rather than set on the view (`width` and `height` would otherwise scale it). Not `position`, which is the
 * view's.
 */
const LAYOUT_PROPS = new Set(LAYOUT_KEYS.filter((key) => key !== 'position'));

const STYLE_LAYOUT_KEYS = new Set(LAYOUT_KEYS);

const host = createHost(PRIMITIVES, {

  // On render, the layout props join the style, which the component lays out.
  getComponentProps (props: Lookup) {
    let result = props;

    for (const key of LAYOUT_PROPS) {
      if (props[key] !== undefined) {
        if (result === props) {
          result = { ...props, style: { ...props.style } };
        }

        result.style[key] = props[key];
        delete result[key];
      }
    }

    return result;
  },

  // Between renders, with only the animated values: layout values go to yoga, the rest to the view (the rest of a
  // style to the view's own, a text's), and only what changed is set.
  applyAnimatedValues (node: AnimatedHostNode, props: Lookup) {
    const view = node.view as unknown as Record<string, unknown>;
    const { layout } = node;
    let layoutStyle: Lookup | null = null;
    let viewProps: Lookup | null = null;
    let didTextStyleChange = false;

    for (const key in props) {
      const value = props[key];

      if (key === 'style') {
        for (const styleKey in value) {
          if (STYLE_LAYOUT_KEYS.has(styleKey)) {
            (layoutStyle ||= {})[styleKey] = value[styleKey];
          } else if (setTextStyleValue(view.style, styleKey, value[styleKey])) {
            didTextStyleChange = true;
          }
        }
      } else if (LAYOUT_PROPS.has(key)) {
        (layoutStyle ||= {})[key] = value;
      } else if (view[key] !== value) {
        (viewProps ||= {})[key] = value;
      }
    }

    viewProps && applyProps(node.view, viewProps);
    layoutStyle && layout.applyLayoutProperties(layoutStyle as Style);

    // A text is measured by its style.
    didTextStyleChange && !layout.isFreed && layout.node.markDirty();

    // Handled either way; `false` would make react-spring re-render the component.
    return true;
  }

});

export const animated = host.animated;

export * from '@react-spring/core';
