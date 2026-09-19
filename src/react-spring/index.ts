import { createHost } from '@react-spring/animated';
import type { Lookup } from '@react-spring/types';
import { BitmapText, Container, Graphics, HTMLText, NineSliceSprite, pickStyle, Sprite, Text, TilingSprite } from '..';
import { applyProps } from '@pixi/react';
import type { NodeContext } from '../flex/Layout';
import { defaultValues, type Style } from '../flex/applyLayoutProperties';

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
const LAYOUT_PROPS = new Set(Object.keys(defaultValues).filter((key) => key !== 'position'));

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

  // Between renders, with only the animated values: layout values go to yoga, the rest to the view, and only what
  // changed is set.
  applyAnimatedValues (node: AnimatedHostNode, props: Lookup) {
    const { style, ...restProps } = props;
    const view = node.view as unknown as Record<string, unknown>;
    const viewProps: Lookup = {};
    let layoutStyle: Lookup | null = style ? pickStyle(style) : null;
    let hasViewProps = false;

    for (const key in restProps) {
      const value = restProps[key];

      if (LAYOUT_PROPS.has(key)) {
        (layoutStyle ||= {})[key] = value;
      } else if (view[key] !== value) {
        viewProps[key] = value;
        hasViewProps = true;
      }
    }

    hasViewProps && applyProps(node.view, viewProps);
    layoutStyle && node.layout.applyLayoutProperties(layoutStyle as Style);

    // Handled either way; `false` would make react-spring re-render the component.
    return true;
  }

});

export const animated = host.animated;

export * from '@react-spring/core';
