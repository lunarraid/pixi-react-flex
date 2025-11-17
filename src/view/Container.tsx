import { Container, Rectangle } from 'pixi.js';
import { extend, PixiReactElementProps } from '@pixi/react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { LayoutNode, LayoutChildren, LayoutProps, NodeContext } from '../flex/Layout';

extend({ Container });

export type ContainerProps = PixiReactElementProps<typeof Container> & LayoutProps;

const FlexContainer = forwardRef(function FlexContainer (props: ContainerProps, ref) {

  const viewRef = useRef<Container>(null);
  const layoutRef = useRef<NodeContext>(null);

  useImperativeHandle(ref, () => ({ view: viewRef.current, layout: layoutRef.current }), []);

  const { onLayout } = props;

  const setLayout = useCallback((x: number, y: number, width: number, height: number) => {
    const c = viewRef.current;
    c.boundsArea ||= new Rectangle();
    c.boundsArea.width = width;
    c.boundsArea.height = height;
    c.position.set(x, y);
    onLayout?.(x, y, width, height);
  }, [ onLayout ]);

  return (
    <LayoutNode style={ props.style } onLayout={ setLayout } ref={ layoutRef }>
      <pixiContainer { ...props } ref={ viewRef }>
        <LayoutChildren>
          { props.children }
        </LayoutChildren>
      </pixiContainer>
    </LayoutNode>
  );

});

FlexContainer.displayName = 'Container';

export default FlexContainer;
