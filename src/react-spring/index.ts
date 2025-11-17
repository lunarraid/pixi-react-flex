import { createHost } from '@react-spring/animated';
import type { Lookup } from '@react-spring/types';
import { BitmapText, Container, Graphics, HTMLText, NineSliceSprite, pickStyle, Sprite, Text, TilingSprite } from '..';
import { applyProps } from '@pixi/react';

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

const host = createHost(PRIMITIVES, {

  applyAnimatedValues (node: any, props: Lookup) {
    const { style, ...restProps } = props;
    const propsDidChange = applyProps(node.view, restProps);

    const layoutStyle = pickStyle(props);
    const styleDidChange = node.layout.applyLayoutProperties(layoutStyle);

    if (styleDidChange || propsDidChange) {
      return true;
    }

    return;
  }

});

export const animated = host.animated;

export * from '@react-spring/core';
