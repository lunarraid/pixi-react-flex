import { Container, type PointData } from 'pixi.js';
import { extend, PixiReactElementProps } from '@pixi/react';
import { forwardRef, useCallback, useImperativeHandle, useRef, type ForwardRefExoticComponent, type Ref } from 'react';
import { LayoutNodeBase, LayoutChildren, LayoutProps, NodeContext } from '../flex/Layout';
import LayoutView, { type LayoutTransformProps } from './LayoutView';

/** The ref is the component's own (`ContainerRef`), so `@pixi/react`'s `ref` prop type is left out. */
export type ContainerProps = Omit<PixiReactElementProps<typeof LayoutContainer>, 'ref'> & LayoutTransformProps & LayoutProps;

export type ContainerRef = { view: LayoutContainer, layout: NodeContext };

const FlexContainer: ForwardRefExoticComponent<ContainerProps & { ref?: Ref<ContainerRef> }> = forwardRef<ContainerRef, ContainerProps>(function FlexContainer (props, ref) {

  const viewRef = useRef<LayoutContainer>(null!);
  const layoutRef = useRef<NodeContext>(null!);

  useImperativeHandle(ref, () => ({ view: viewRef.current, layout: layoutRef.current }), []);

  const { style, onLayout, measure: _measure, children, ...pixiProps } = props;

  const setLayout = useCallback((x: number, y: number, width: number, height: number) => {
    // No `boundsArea`: a container is bounded by its children, so filters on it aren't clipped to its box.
    viewRef.current.applyLayout(x, y, width, height);
    onLayout?.(x, y, width, height);
  }, [ onLayout ]);

  return (
    <LayoutNodeBase viewRef={ viewRef } style={ style } onLayout={ setLayout } ref={ layoutRef }>
      <pixiLayoutContainer { ...pixiProps } ref={ viewRef }>
        <LayoutChildren>
          { children }
        </LayoutChildren>
      </pixiLayoutContainer>
    </LayoutNodeBase>
  );

});

FlexContainer.displayName = 'Container';

export default FlexContainer;

/** A container hit anywhere in its layout box when interactive (children are hit first, so overhanging ones still are). */
export class LayoutContainer extends LayoutView(Container) {

  containsPoint (point: PointData): boolean {
    return this.layoutBox.contains(point.x, point.y);
  }

}

extend({ LayoutContainer });

declare module '@pixi/react' {
  interface PixiElements {
    pixiLayoutContainer: PixiReactElementProps<typeof LayoutContainer>;
  }
}
