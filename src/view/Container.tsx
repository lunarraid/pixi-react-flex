import { Container, Rectangle } from 'pixi.js';
import { extend, PixiReactElementProps } from '@pixi/react';
import { forwardRef, useCallback, useImperativeHandle, useRef, type ForwardRefExoticComponent, type Ref } from 'react';
import { LayoutNode, LayoutChildren, LayoutProps, NodeContext } from '../flex/Layout';

extend({ Container });

export type ContainerProps = PixiReactElementProps<typeof Container> & LayoutProps;

export type ContainerRef = { view: Container, layout: NodeContext };

const FlexContainer: ForwardRefExoticComponent<ContainerProps & { ref?: Ref<ContainerRef> }> = forwardRef<ContainerRef, ContainerProps>(function FlexContainer (props, ref) {

  const viewRef = useRef<Container>(null!);
  const layoutRef = useRef<NodeContext>(null!);

  useImperativeHandle(ref, () => ({ view: viewRef.current, layout: layoutRef.current }), []);

  const { style, onLayout, measure: _measure, children, ...pixiProps } = props;

  const setLayout = useCallback((x: number, y: number, width: number, height: number) => {
    const c = viewRef.current;
    c.boundsArea ||= new Rectangle();
    c.boundsArea.width = width;
    c.boundsArea.height = height;
    c.position.set(x, y);
    onLayout?.(x, y, width, height);
  }, [ onLayout ]);

  return (
    <LayoutNode style={ style } onLayout={ setLayout } ref={ layoutRef }>
      <pixiContainer { ...pixiProps } ref={ viewRef }>
        <LayoutChildren>
          { children }
        </LayoutChildren>
      </pixiContainer>
    </LayoutNode>
  );

});

FlexContainer.displayName = 'Container';

export default FlexContainer;
