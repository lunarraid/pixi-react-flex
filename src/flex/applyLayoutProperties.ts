import { useRef } from 'react';
import { Align,
  Display,
  Edge,
  FlexDirection,
  Gutter,
  Justify,
  Node,
  Overflow,
  PositionType,
  Wrap
} from 'yoga-layout/load';

/**
 * applyLayoutProperties.js
 * Copyright 2017 Raymond Cook
 *
 * Derived from yoga-js -- https://github.com/vincentriemer/yoga-js
 * Copyright 2017 Vincent Riemer
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

export const defaultValues = {
  left: NaN,
  right: NaN,
  top: NaN,
  bottom: NaN,
  alignContent: 'flex-start',
  alignItems: 'stretch',
  alignSelf: 'auto',
  flexDirection: 'row',
  flexWrap: 'no-wrap',
  justifyContent: 'flex-start',
  margin: NaN,
  marginBottom: NaN,
  marginHorizontal: NaN,
  marginLeft: NaN,
  marginRight: NaN,
  marginTop: NaN,
  marginVertical: NaN,
  overflow: 'visible',
  display: 'flex',
  flex: 0,
  flexBasis: 'auto',
  flexGrow: 0,
  flexShrink: 1,
  aspectRatio: NaN,
  height: 'auto',
  minWidth: NaN,
  minHeight: NaN,
  maxWidth: NaN,
  maxHeight: NaN,
  borderWidth: NaN,
  borderWidthBottom: NaN,
  borderWidthHorizontal: NaN,
  borderWidthLeft: NaN,
  borderWidthRight: NaN,
  borderWidthTop: NaN,
  borderWidthVertical: NaN,
  padding: NaN,
  paddingBottom: NaN,
  paddingHorizontal: NaN,
  paddingLeft: NaN,
  paddingRight: NaN,
  paddingTop: NaN,
  paddingVertical: NaN,
  position: 'relative',
  rowGap: 0,
  columnGap: 0
};

export type LayoutStyle = {
  left?: number,
  right?: number,
  top?: number,
  bottom?: number,
  alignContent?: StrJustify,
  alignItems?: StrAlign,
  alignSelf?: StrAlign,
  flexDirection?: StrFlexDirection,
  flexWrap?: StrWrap,
  justifyContent?: StrJustify,
  margin?: number,
  marginBottom?: number,
  marginHorizontal?: number,
  marginLeft?: number,
  marginRight?: number,
  marginTop?: number,
  marginVertical?: number,
  overflow?: StrOverflow,
  display?: StrDisplay,
  flex?: number,
  flexBasis?: number | string,
  flexGrow?: number | string,
  flexShrink?: number | string,
  aspectRatio?: number,
  height?: number | string | undefined,
  minWidth?: number,
  minHeight?: number,
  maxWidth?: number,
  maxHeight?: number,
  borderWidth?: number,
  borderWidthBottom?: number,
  borderWidthHorizontal?: number,
  borderWidthLeft?: number,
  borderWidthRight?: number,
  borderWidthTop?: number,
  borderWidthVertical?: number,
  padding?: number,
  paddingBottom?: number,
  paddingHorizontal?: number,
  paddingLeft?: number,
  paddingRight?: number,
  paddingTop?: number,
  paddingVertical?: number,
  position?: StrPositionType,
  rowGap?: number,
  columnGap?: number
};

export type Style = LayoutStyle & {
  [key: string]: any
};

export function pickStyle (value: any): LayoutStyle {
  const result = {} as LayoutStyle;

  for (const key in value) {
    if (defaultValues.hasOwnProperty(key)) {
      result[key] = value[key];
    }
  }

  return result;
}

export enum StrAlign {
  Auto = 'auto',
  FlexStart = 'flex-start',
  Center = 'center',
  FlexEnd = 'flex-end',
  Stretch = 'stretch',
  Baseline = 'baseline',
  SpaceBetween = 'space-between',
  SpaceAround = 'space-around'
};

export const alignEnumMapping = {
  [StrAlign.Auto]: Align.Auto,
  [StrAlign.FlexStart]: Align.FlexStart,
  [StrAlign.Center]: Align.Center,
  [StrAlign.FlexEnd]: Align.FlexEnd,
  [StrAlign.Stretch]: Align.Stretch,
  [StrAlign.Baseline]: Align.Baseline,
  [StrAlign.SpaceBetween]: Align.SpaceBetween,
  [StrAlign.SpaceAround]: Align.SpaceAround
};

export enum StrFlexDirection {
  Column = 'column',
  ColumnReverse = 'column-reverse',
  Row = 'row',
  RowReverse = 'row-reverse'
}

export const flexDirectionEnumMapping = {
  [StrFlexDirection.Column]: FlexDirection.Column,
  [StrFlexDirection.ColumnReverse]: FlexDirection.ColumnReverse,
  [StrFlexDirection.Row]: FlexDirection.Row,
  [StrFlexDirection.RowReverse]: FlexDirection.RowReverse
};

export enum StrWrap {
  NoWrap = 'no-wrap',
  Wrap = 'wrap',
  WrapReverse = 'wrap-reverse'
}

export const flexWrapEnumMapping = {
  [StrWrap.NoWrap]: Wrap.NoWrap,
  [StrWrap.Wrap]: Wrap.Wrap,
  [StrWrap.WrapReverse]: Wrap.WrapReverse
};

export enum StrJustify {
  FlexStart = 'flex-start',
  Center = 'center',
  FlexEnd = 'flex-end',
  SpaceBetween = 'space-between',
  SpaceAround = 'space-around',
  SpaceEvenly = 'space-evenly'
}

export const justifyContentEnumMapping = {
  [StrJustify.FlexStart]: Justify.FlexStart,
  [StrJustify.Center]: Justify.Center,
  [StrJustify.FlexEnd]: Justify.FlexEnd,
  [StrJustify.SpaceBetween]: Justify.SpaceBetween,
  [StrJustify.SpaceAround]: Justify.SpaceAround,
  [StrJustify.SpaceEvenly]: Justify.SpaceEvenly
};

export enum StrOverflow {
  Visible = 'visible',
  Hidden = 'hidden',
  Scroll = 'scroll'
}

export const overflowEnumMapping = {
  [StrOverflow.Visible]: Overflow.Visible,
  [StrOverflow.Hidden]: Overflow.Hidden,
  [StrOverflow.Scroll]: Overflow.Scroll
};

export enum StrDisplay {
  Flex = 'flex',
  None = 'none'
}

export const displayEnumMapping = {
  [StrDisplay.Flex]: Display.Flex,
  [StrDisplay.None]: Display.None
};

export enum StrPositionType {
  Relative = 'relative',
  Absolute = 'absolute',
  Static = 'static'
}

export const positionTypeEnumMapping = {
  [StrPositionType.Relative]: PositionType.Relative,
  [StrPositionType.Absolute]: PositionType.Absolute,
  [StrPositionType.Static]: PositionType.Static
};

const setterMap = {

  alignContent (node: Node, value: StrAlign) {
    node.setAlignContent(alignEnumMapping[value]);
  },

  alignItems (node: Node, value: StrAlign) {
    node.setAlignItems(alignEnumMapping[value]);
  },

  alignSelf (node: Node, value: StrAlign) {
    node.setAlignSelf(alignEnumMapping[value]);
  },

  flexDirection (node: Node, value: StrFlexDirection) {
    node.setFlexDirection(flexDirectionEnumMapping[value]);
  },

  flexWrap (node: Node, value: StrWrap) {
    node.setFlexWrap(flexWrapEnumMapping[value]);
  },

  justifyContent (node: Node, value: StrJustify) {
    node.setJustifyContent(justifyContentEnumMapping[value]);
  },

  left (node: Node, value: number | `${number}%` | undefined) {
    node.setPosition(Edge.Left, value);
  },

  right (node: Node, value: number | `${number}%` | undefined) {
    node.setPosition(Edge.Right, value);
  },

  top (node: Node, value: number | `${number}%` | undefined) {
    node.setPosition(Edge.Top, value);
  },

  bottom (node: Node, value: number | `${number}%` | undefined) {
    node.setPosition(Edge.Bottom, value);
  },

  margin (node: Node, value: number | string | undefined) {
    if (typeof value === 'string') {
      const valueList = value.split(' ') as (number | `${number}%` | 'auto')[];

      switch (valueList.length) {

        case 1:
          node.setMargin(Edge.All, valueList[0]);
          break;

        case 2:
          node.setMargin(Edge.Vertical, valueList[0]);
          node.setMargin(Edge.Horizontal, valueList[1]);
          break;

        case 3:
          node.setMargin(Edge.Top, valueList[0]);
          node.setMargin(Edge.Horizontal, valueList[1]);
          node.setMargin(Edge.Bottom, valueList[2]);
          break;

        case 4:
          node.setMargin(Edge.Top, valueList[0]);
          node.setMargin(Edge.Right, valueList[1]);
          node.setMargin(Edge.Bottom, valueList[2]);
          node.setMargin(Edge.Left, valueList[3]);
          break;

        default:
          console.warn('Bad value passed to "margin"', value);
          break;

      }
    } else if (typeof value === 'number') {
      node.setMargin(Edge.All, value);
    }
  },

  marginBottom (node: Node, value:  number | 'auto' | `${number}%` | undefined) {
    node.setMargin(Edge.Bottom, value);
  },

  marginHorizontal (node: Node, value: number | 'auto' | `${number}%` | undefined) {
    node.setMargin(Edge.Horizontal, value);
  },

  marginLeft (node: Node, value: number | 'auto' | `${number}%` | undefined) {
    node.setMargin(Edge.Left, value);
  },

  marginRight (node: Node, value: number | 'auto' | `${number}%` | undefined) {
    node.setMargin(Edge.Right, value);
  },

  marginTop (node: Node, value: number | 'auto' | `${number}%` | undefined) {
    node.setMargin(Edge.Top, value);
  },

  marginVertical (node: Node, value: number | 'auto' | `${number}%` | undefined) {
    node.setMargin(Edge.Vertical, value);
  },


  overflow (node: Node, value: number | 'auto' | `${number}%` | undefined) {
    node.setOverflow(overflowEnumMapping[value]);
  },

  display (node: Node, value: StrDisplay) {
    node.setDisplay(displayEnumMapping[value]);
  },

  flex (node: Node, value: number) {
    node.setFlex(value);
  },

  flexBasis (node: Node, value:  number | `${number}%` | 'auto') {
    node.setFlexBasis(value);
  },

  flexGrow (node: Node, value: number) {
    node.setFlexGrow(value);
  },

  flexShrink (node: Node, value: number) {
    node.setFlexShrink(value);
  },

  aspectRatio (node: Node, value: number) {
    node.setAspectRatio(value);
  },

  width (node: Node, value: number | `${number}%` | 'auto') {
    node.setWidth(value);
  },

  height (node: Node, value: number | `${number}%` | 'auto') {
    node.setHeight(value);
  },

  minWidth (node: Node, value: number | `${number}%`) {
    node.setMinWidth(value);
  },

  minHeight (node: Node, value: number | `${number}%`) {
    node.setMinHeight(value);
  },

  maxWidth (node: Node, value: number | `${number}%`) {
    node.setMaxWidth(value);
  },

  maxHeight (node: Node, value: number | `${number}%`) {
    node.setMaxHeight(value);
  },

  borderWidth (node: Node, value: number | string) {
    if (typeof value === 'string') {
      const valueList = value.split(' ');

      switch (valueList.length) {

        case 1:
          node.setBorder(Edge.All, Number(valueList[0]));
          break;

        case 2:
          node.setBorder(Edge.Vertical, Number(valueList[0]));
          node.setBorder(Edge.Horizontal, Number(valueList[1]));
          break;

        case 3:
          node.setBorder(Edge.Top, Number(valueList[0]));
          node.setBorder(Edge.Horizontal, Number(valueList[1]));
          node.setBorder(Edge.Bottom, Number(valueList[2]));
          break;

        case 4:
          node.setBorder(Edge.Top, Number(valueList[0]));
          node.setBorder(Edge.Right, Number(valueList[1]));
          node.setBorder(Edge.Bottom, Number(valueList[2]));
          node.setBorder(Edge.Left, Number(valueList[3]));
          break;

        default:
          console.warn('Bad value passed to "borderWidth"', value);
          break;

      }
    } else if (typeof value === 'number' || value === undefined) {
      node.setBorder(Edge.All, value);
    }
  },

  borderBottomWidth (node: Node, value: number | undefined) {
    node.setBorder(Edge.Bottom, value);
  },

  borderLeftWidth (node: Node, value: number | undefined) {
    node.setBorder(Edge.Left, value);
  },

  borderRightWidth (node: Node, value: number | undefined) {
    node.setBorder(Edge.Right, value);
  },

  borderTopWidth (node: Node, value: number | undefined) {
    node.setBorder(Edge.Top, value);
  },

  padding (node: Node, value: number | string | undefined) {
    if (typeof value === 'string') {

      const valueList = value
        .split(' ')
        .map((value) => {
          if (value.endsWith('%')) {
            return value as `${number}%`;
          } else {
            return Number(value);
          }
        });

      switch (valueList.length) {

        case 1:
          node.setPadding(Edge.All, valueList[0]);
          break;

        case 2:
          node.setPadding(Edge.Vertical, valueList[0]);
          node.setPadding(Edge.Horizontal, valueList[1]);
          break;

        case 3:
          node.setPadding(Edge.Top, valueList[0]);
          node.setPadding(Edge.Horizontal, valueList[1]);
          node.setPadding(Edge.Bottom, valueList[2]);
          break;

        case 4:
          node.setPadding(Edge.Top, valueList[0]);
          node.setPadding(Edge.Right, valueList[1]);
          node.setPadding(Edge.Bottom, valueList[2]);
          node.setPadding(Edge.Left, valueList[3]);
          break;

        default:
          console.warn('Bad value passed to "padding"', value);
          break;

      }
    } else if (typeof value === 'number' || value === undefined) {
      node.setPadding(Edge.All, value);
    }
  },

  paddingBottom (node: Node, value: number | `${number}%` | undefined) {
    node.setPadding(Edge.Bottom, value);
  },

  paddingHorizontal (node: Node, value: number | `${number}%` | undefined) {
    node.setPadding(Edge.Horizontal, value);
  },

  paddingLeft (node: Node, value: number | `${number}%` | undefined) {
    node.setPadding(Edge.Left, value);
  },

  paddingRight (node: Node, value: number | `${number}%` | undefined) {
    node.setPadding(Edge.Right, value);
  },

  paddingTop (node: Node, value: number | `${number}%` | undefined) {
    node.setPadding(Edge.Top, value);
  },

  paddingVertical (node: Node, value: number | `${number}%` | undefined) {
    node.setPadding(Edge.Vertical, value);
  },

  position (node: Node, value: StrPositionType) {
    node.setPositionType(positionTypeEnumMapping[value]);
  },

  rowGap (node: Node, value: number | `${number}%` | undefined) {
    node.setGap(Gutter.Row, value);
  },

  columnGap (node: Node, value: number | `${number}%` | undefined) {
    node.setGap(Gutter.Column, value);
  }

};

export function isShallowEqual (props1: any, props2: any): boolean {

  if (props1 === props2) {
    return true;
  }

  if (!props1 || !props2) {
    return false;
  }

  for (const key in props1) {
    if (setterMap[key] && (!props2.hasOwnProperty(key) || props1[key] !== props2[key])) {
      return false;
    }
  }

  for (const key in props2) {
    if (setterMap[key] && (!props1.hasOwnProperty(key) || props1[key] !== props2[key])) {
      return false;
    }
  }

  return true;
}

export function useShallowMemo (value: any) {
  const memoizedValueRef = useRef(value);

  const isEqual = isShallowEqual(value, memoizedValueRef.current);

  if (!isEqual) {
    memoizedValueRef.current = value;
  }

  return memoizedValueRef.current;
};

export default function applyLayoutProperties (node: Node, oldProps: object, newProps: object, defaults: object | null = null) {
  if (isShallowEqual(oldProps, newProps)) {
    return false;
  }

  for (const propName in oldProps) {
    const propSetter = setterMap[propName];

    if (propSetter && !newProps.hasOwnProperty(propName)) {

      const value = defaults && defaults.hasOwnProperty(propName)
        ? defaults[propName]
        : defaultValues[propName];

      propSetter(node, value);
    }
  }

  for (const propName in newProps) {
    const propSetter = setterMap[propName];

    if (propSetter) {
      propSetter(node, newProps[propName]);
    }
  }

  return true;
}
