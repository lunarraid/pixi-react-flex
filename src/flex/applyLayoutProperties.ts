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

type Dimension = number | `${ number }%`;

export type LayoutStyle = {
  left?: Dimension,
  right?: Dimension,
  top?: Dimension,
  bottom?: Dimension,
  alignContent?: StrAlign,
  alignItems?: StrAlign,
  alignSelf?: StrAlign,
  flexDirection?: StrFlexDirection,
  flexWrap?: StrWrap,
  justifyContent?: StrJustify,
  margin?: Dimension | 'auto' | string,
  marginBottom?: Dimension | 'auto',
  marginHorizontal?: Dimension | 'auto',
  marginLeft?: Dimension | 'auto',
  marginRight?: Dimension | 'auto',
  marginTop?: Dimension | 'auto',
  marginVertical?: Dimension | 'auto',
  overflow?: StrOverflow,
  display?: StrDisplay,
  flex?: number,
  flexBasis?: Dimension | 'auto',
  flexGrow?: number,
  flexShrink?: number,
  aspectRatio?: number,
  width?: Dimension | 'auto',
  height?: Dimension | 'auto',
  minWidth?: Dimension,
  minHeight?: Dimension,
  maxWidth?: Dimension,
  maxHeight?: Dimension,
  borderWidth?: number | string,
  borderBottomWidth?: number,
  borderLeftWidth?: number,
  borderRightWidth?: number,
  borderTopWidth?: number,
  padding?: Dimension | string,
  paddingBottom?: Dimension,
  paddingHorizontal?: Dimension,
  paddingLeft?: Dimension,
  paddingRight?: Dimension,
  paddingTop?: Dimension,
  paddingVertical?: Dimension,
  position?: StrPositionType,
  rowGap?: Dimension,
  columnGap?: Dimension
};

export type Style = LayoutStyle & {
  [key: string]: unknown
};

export function pickStyle (value: unknown): LayoutStyle {
  const result: Record<string, unknown> = {};

  if (typeof value !== 'object' || value === null) {
    return result as LayoutStyle;
  }

  const source = value as Record<string, unknown>;

  for (const key in source) {
    if (setterMap[key]) {
      result[key] = source[key];
    }
  }

  return result as LayoutStyle;
}

enum EnumAlign {
  Auto = 'auto',
  FlexStart = 'flex-start',
  Center = 'center',
  FlexEnd = 'flex-end',
  Stretch = 'stretch',
  Baseline = 'baseline',
  SpaceBetween = 'space-between',
  SpaceAround = 'space-around'
};

export type StrAlign = `${ EnumAlign }`;

const alignEnumMapping = {
  [EnumAlign.Auto]: Align.Auto,
  [EnumAlign.FlexStart]: Align.FlexStart,
  [EnumAlign.Center]: Align.Center,
  [EnumAlign.FlexEnd]: Align.FlexEnd,
  [EnumAlign.Stretch]: Align.Stretch,
  [EnumAlign.Baseline]: Align.Baseline,
  [EnumAlign.SpaceBetween]: Align.SpaceBetween,
  [EnumAlign.SpaceAround]: Align.SpaceAround
};

export enum EnumFlexDirection {
  Column = 'column',
  ColumnReverse = 'column-reverse',
  Row = 'row',
  RowReverse = 'row-reverse'
}

export type StrFlexDirection = `${ EnumFlexDirection }`;

const flexDirectionEnumMapping = {
  [EnumFlexDirection.Column]: FlexDirection.Column,
  [EnumFlexDirection.ColumnReverse]: FlexDirection.ColumnReverse,
  [EnumFlexDirection.Row]: FlexDirection.Row,
  [EnumFlexDirection.RowReverse]: FlexDirection.RowReverse
};

enum EnumWrap {
  NoWrap = 'no-wrap',
  Wrap = 'wrap',
  WrapReverse = 'wrap-reverse'
}

export type StrWrap = `${ EnumWrap }`;

const flexWrapEnumMapping = {
  [EnumWrap.NoWrap]: Wrap.NoWrap,
  [EnumWrap.Wrap]: Wrap.Wrap,
  [EnumWrap.WrapReverse]: Wrap.WrapReverse
};

enum EnumJustify {
  FlexStart = 'flex-start',
  Center = 'center',
  FlexEnd = 'flex-end',
  SpaceBetween = 'space-between',
  SpaceAround = 'space-around',
  SpaceEvenly = 'space-evenly'
}

export type StrJustify = `${ EnumJustify }`;

const justifyContentEnumMapping = {
  [EnumJustify.FlexStart]: Justify.FlexStart,
  [EnumJustify.Center]: Justify.Center,
  [EnumJustify.FlexEnd]: Justify.FlexEnd,
  [EnumJustify.SpaceBetween]: Justify.SpaceBetween,
  [EnumJustify.SpaceAround]: Justify.SpaceAround,
  [EnumJustify.SpaceEvenly]: Justify.SpaceEvenly
};

enum EnumOverflow {
  Visible = 'visible',
  Hidden = 'hidden',
  Scroll = 'scroll'
}

export type StrOverflow = `${ EnumOverflow }`;

const overflowEnumMapping = {
  [EnumOverflow.Visible]: Overflow.Visible,
  [EnumOverflow.Hidden]: Overflow.Hidden,
  [EnumOverflow.Scroll]: Overflow.Scroll
};

enum EnumDisplay {
  Flex = 'flex',
  None = 'none'
}

export type StrDisplay = `${ EnumDisplay }`;

const displayEnumMapping = {
  [EnumDisplay.Flex]: Display.Flex,
  [EnumDisplay.None]: Display.None
};

enum EnumPositionType {
  Relative = 'relative',
  Absolute = 'absolute',
  Static = 'static'
}

export type StrPositionType = `${ EnumPositionType }`;

const positionTypeEnumMapping = {
  [EnumPositionType.Relative]: PositionType.Relative,
  [EnumPositionType.Absolute]: PositionType.Absolute,
  [EnumPositionType.Static]: PositionType.Static
};

const setterMap: Record<string, (node: Node, value: never) => void> = {

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


  overflow (node: Node, value: StrOverflow) {
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

/** Every key of a style that is laid out. */
export const LAYOUT_KEYS: readonly string[] = Object.keys(setterMap);

export function isShallowEqual (props1: Record<string, unknown> | null | undefined, props2: Record<string, unknown> | null | undefined): boolean {

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

export function useShallowMemo<T extends Record<string, unknown> | null | undefined> (value: T): T {
  const memoizedValueRef = useRef(value);

  const isEqual = isShallowEqual(value, memoizedValueRef.current);

  if (!isEqual) {
    memoizedValueRef.current = value;
  }

  return memoizedValueRef.current;
};

type Props = Record<string, unknown> | null | undefined;

// The shorthands, which write different yoga edges for different numbers of values. Yoga prefers a narrower edge to a
// wider one whichever was set last, so edges a value wrote that the next doesn't would stay in force.
const SHORTHANDS = new Set([ 'margin', 'padding', 'borderWidth' ]);

function valueCount (value: unknown) {
  return typeof value === 'string' ? value.split(' ').length : 1;
}

// Whether going from one style to the other takes more than setting values: a key was dropped (or became undefined,
// which is the same), or a shorthand changed the edges it writes.
function needsReset (oldProps: Props, newProps: Props) {
  for (const propName in oldProps) {
    const oldValue = oldProps[propName];

    if (!setterMap[propName] || oldValue === undefined) {
      continue;
    }

    const value = newProps?.[propName];

    if (value === undefined) {
      return true;
    }

    if (value !== oldValue && SHORTHANDS.has(propName) && valueCount(value) !== valueCount(oldValue)) {
      return true;
    }
  }

  return false;
}

// Shorthands first, so that an edge's own key (`marginLeft`) wins over one (`margin`) wherever it is in the style, as
// in React Native.
function setProperties (node: Node, props: Props) {
  for (const propName in props) {
    if (SHORTHANDS.has(propName) && props[propName] !== undefined) {
      setterMap[propName](node, props[propName] as never);
    }
  }

  for (const propName in props) {
    const propSetter = setterMap[propName];

    if (propSetter && !SHORTHANDS.has(propName) && props[propName] !== undefined) {
      propSetter(node, props[propName] as never);
    }
  }
}

// Sets the values that changed, given that no reset is needed. A shorthand that changed may write over its edges' own
// keys, so everything is set again after one.
function setChangedProperties (node: Node, oldProps: Props, newProps: Props): boolean {
  let didChange = false;
  let didShorthandChange = false;

  for (const propName in newProps) {
    const propSetter = setterMap[propName];
    const value = newProps[propName];

    if (!propSetter || value === undefined || value === oldProps?.[propName]) {
      continue;
    }

    didChange = true;

    if (SHORTHANDS.has(propName)) {
      didShorthandChange = true;
    } else {
      propSetter(node, value as never);
    }
  }

  didShorthandChange && setProperties(node, newProps);

  return didChange;
}

/**
 * Takes a node from one style to another, and returns whether anything changed. An undefined value is the same as no
 * key.
 *
 * Only values that changed are set. When a key is dropped, the node's style is reset from `pristine`, an unstyled
 * node with the same config (so with the defaults the node had, which `useWebDefaults` changes), and the style is
 * set again in full.
 */
export default function applyLayoutProperties (node: Node, pristine: Node, oldStyle: Props, newStyle: Props): boolean {
  if (oldStyle === newStyle) {
    return false;
  }

  if (needsReset(oldStyle, newStyle)) {
    node.copyStyle(pristine);
    setProperties(node, newStyle);
    return true;
  }

  return setChangedProperties(node, oldStyle, newStyle);
}

/** `style` with the values of `overrides` over its own: `style` itself when there are none. */
export function mergeStyles<T extends Record<string, unknown>> (style: T | null, overrides: T | null): T | null {
  let result: Record<string, unknown> | null = null;

  for (const key in overrides) {
    if (overrides[key] !== undefined) {
      (result ||= { ...style })[key] = overrides[key];
    }
  }

  return (result as T | null) || style;
}
