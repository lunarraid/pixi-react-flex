import { Container, Rectangle } from 'pixi.js';
import { extend } from '@pixi/react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { LayoutNode, LayoutChildren } from '../flex/Layout.jsx';

extend({ Container });

const FlexContainer = forwardRef(function FlexContainer (props, ref) {

  const viewRef = useRef(null);

  useImperativeHandle(ref, () => viewRef.current, []);

  const { onLayout } = props;

  const setLayout = useCallback((x, y, width, height) => {
    const c = viewRef.current;
    c.boundsArea ||= new Rectangle();
    c.boundsArea.width = width;
    c.boundsArea.height = height;
    c.position.set(x, y);
    onLayout?.(x, y, width, height);
  }, [ onLayout ]);

  return (
    <LayoutNode style={ props.style } onLayout={ setLayout }>
      <container { ...props } ref={ viewRef }>
        <LayoutChildren>
          { props.children }
        </LayoutChildren>
      </container>
    </LayoutNode>
  );

});

export default FlexContainer;
