import { createHost } from '@react-spring/animated';
import type { Lookup } from '@react-spring/types';
import { BitmapText, Container, Graphics, HTMLText, NineSliceSprite, pickStyle, Sprite, Text, TilingSprite } from '..';
import { applyProps } from '@pixi/react';
import type { NodeContext } from '../flex/Layout';

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

const host = createHost(PRIMITIVES, {

  applyAnimatedValues (node: AnimatedHostNode, props: Lookup) {
    const { style: _style, ...restProps } = props;
    applyProps(node.view, restProps);

    const layoutStyle = pickStyle(props);
    node.layout.applyLayoutProperties(layoutStyle);

    // TODO: Make a way to determine if props actually changed here instead
    // of returning true all the time
    return true;
  }

});

export const animated = host.animated;

export * from '@react-spring/core';
