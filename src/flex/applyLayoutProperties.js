import { Align,
  Display,
  Edge,
  FlexDirection,
  Gutter,
  Justify,
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

export const alignEnumMapping = {
  auto: Align.Auto,
  'flex-start': Align.FlexStart,
  center: Align.Center,
  'flex-end': Align.FlexEnd,
  stretch: Align.Stretch,
  baseline: Align.Baseline,
  'space-between': Align.SpaceBetween,
  'space-around': Align.SpaceAround
};

export const flexDirectionEnumMapping = {
  column: FlexDirection.Column,
  'column-reverse': FlexDirection.ColumnReverse,
  row: FlexDirection.Row,
  'row-reverse': FlexDirection.RowReverse
};

export const flexWrapEnumMapping = {
  'no-wrap': Wrap.NoWrap,
  wrap: Wrap.Wrap,
  'wrap-reverse': Wrap.WrapReverse
};

export const justifyContentEnumMapping = {
  'flex-start': Justify.FlexStart,
  center: Justify.Center,
  'flex-end': Justify.FlexEnd,
  'space-between': Justify.SpaceBetween,
  'space-around': Justify.SpaceAround,
  'space-evenly': Justify.SpaceEvenly
};

export const overflowEnumMapping = {
  visible: Overflow.Visible,
  hidden: Overflow.Hidden,
  scroll: Overflow.Scroll
};

export const displayEnumMapping = {
  flex: Display.Flex,
  none: Display.None
};

export const positionTypeEnumMapping = {
  relative: PositionType.Relative,
  absolute: PositionType.Absolute,
  static: PositionType.Static
};

const setterMap = {

  alignContent (node, value) {
    node.setAlignContent(alignEnumMapping[value]);
  },

  alignItems (node, value) {
    node.setAlignItems(alignEnumMapping[value]);
  },

  alignSelf (node, value) {
    node.setAlignSelf(alignEnumMapping[value]);
  },

  flexDirection (node, value) {
    node.setFlexDirection(flexDirectionEnumMapping[value]);
  },

  flexWrap (node, value) {
    node.setFlexWrap(flexWrapEnumMapping[value]);
  },

  justifyContent (node, value) {
    node.setJustifyContent(justifyContentEnumMapping[value]);
  },

  left (node, value) {
    node.setPosition(Edge.Left, value);
  },

  right (node, value) {
    node.setPosition(Edge.Right, value);
  },

  top (node, value) {
    node.setPosition(Edge.Top, value);
  },

  bottom (node, value) {
    node.setPosition(Edge.Bottom, value);
  },

  margin (node, value) {
    if (typeof value === 'string') {
      const valueList = value.split(' ');

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

  marginBottom (node, value) {
    node.setMargin(Edge.Bottom, value);
  },

  marginHorizontal (node, value) {
    node.setMargin(Edge.Horizontal, value);
  },

  marginLeft (node, value) {
    node.setMargin(Edge.Left, value);
  },

  marginRight (node, value) {
    node.setMargin(Edge.Right, value);
  },

  marginTop (node, value) {
    node.setMargin(Edge.Top, value);
  },

  marginVertical (node, value) {
    node.setMargin(Edge.Vertical, value);
  },


  overflow (node, value) {
    node.setOverflow(overflowEnumMapping[value]);
  },

  display (node, value) {
    node.setDisplay(displayEnumMapping[value]);
  },

  flex (node, value) {
    node.setFlex(value);
  },

  flexBasis (node, value) {
    node.setFlexBasis(value);
  },

  flexGrow (node, value) {
    node.setFlexGrow(value);
  },

  flexShrink (node, value) {
    node.setFlexShrink(value);
  },

  aspectRatio (node, value) {
    node.setAspectRatio(value);
  },

  width (node, value) {
    node.setWidth(value);
  },

  height (node, value) {
    node.setHeight(value);
  },

  minWidth (node, value) {
    node.setMinWidth(value);
  },

  minHeight (node, value) {
    node.setMinHeight(value);
  },

  maxWidth (node, value) {
    node.setMaxWidth(value);
  },

  maxHeight (node, value) {
    node.setMaxHeight(value);
  },

  borderWidth (node, value) {
    if (typeof value === 'string') {
      const valueList = value.split(' ');

      switch (valueList.length) {

        case 1:
          node.setBorder(Edge.All, valueList[0]);
          break;

        case 2:
          node.setBorder(Edge.Vertical, valueList[0]);
          node.setBorder(Edge.Horizontal, valueList[1]);
          break;

        case 3:
          node.setBorder(Edge.Top, valueList[0]);
          node.setBorder(Edge.Horizontal, valueList[1]);
          node.setBorder(Edge.Bottom, valueList[2]);
          break;

        case 4:
          node.setBorder(Edge.Top, valueList[0]);
          node.setBorder(Edge.Right, valueList[1]);
          node.setBorder(Edge.Bottom, valueList[2]);
          node.setBorder(Edge.Left, valueList[3]);
          break;

        default:
          console.warn('Bad value passed to "borderWidth"', value);
          break;

      }
    } else if (typeof value === 'number') {
      node.setBorder(Edge.All, value);
    }
  },

  borderBottomWidth (node, value) {
    node.setBorder(Edge.Bottom, value);
  },

  borderLeftWidth (node, value) {
    node.setBorder(Edge.Left, value);
  },

  borderRightWidth (node, value) {
    node.setBorder(Edge.Right, value);
  },

  borderTopWidth (node, value) {
    node.setBorder(Edge.Top, value);
  },

  padding (node, value) {
    if (typeof value === 'string') {
      const valueList = value.split(' ');

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
    } else if (typeof value === 'number') {
      node.setPadding(Edge.All, value);
    }
  },

  paddingBottom (node, value) {
    node.setPadding(Edge.Bottom, value);
  },

  paddingHorizontal (node, value) {
    node.setPadding(Edge.Horizontal, value);
  },

  paddingLeft (node, value) {
    node.setPadding(Edge.Left, value);
  },

  paddingRight (node, value) {
    node.setPadding(Edge.Right, value);
  },

  paddingTop (node, value) {
    node.setPadding(Edge.Top, value);
  },

  paddingVertical (node, value) {
    node.setPadding(Edge.Vertical, value);
  },

  position (node, value) {
    node.setPositionType(positionTypeEnumMapping[value]);
  },

  rowGap (node, value) {
    node.setGap(Gutter.Row, value);
  },

  columnGap (node, value) {
    node.setGap(Gutter.Column, value);
  }

};

function isShallowEqual (props1, props2) {

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

export default function applyLayoutProperties (node, oldProps, newProps, defaults) {
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
