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
    applyProps(node.view, restProps);

    const layoutStyle = pickStyle(props);
    node.layout.applyLayoutProperties(layoutStyle);

    // TODO: Make a way to determine if props actuallt changed here instead
    // of returning true all the time
    return true;
  }

});

export const animated = host.animated;

export * from '@react-spring/core';
