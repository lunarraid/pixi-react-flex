import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { extend, PixiReactElementProps } from '@pixi/react';
import { Graphics, Rectangle } from 'pixi.js';
import { LayoutNode, LayoutProps } from '../flex/Layout.js';

extend({ Graphics });

export type GraphicsProps = PixiReactElementProps<typeof Graphics> & LayoutProps;

const FlexGraphics = forwardRef(function FlexGraphics (props: GraphicsProps, ref) {

  if (props.children) {
    throw new Error('Only containers allow children');
  }

  const layoutRef = useRef(null);
  const viewRef = useRef(null);

  useImperativeHandle(ref, () => ({ view: viewRef.current, layout: layoutRef.current }), []);

  const { onLayout } = props;

  useLayoutEffect(() => {
    const { context } = viewRef.current;

    const onUpdate = () => layoutRef.current.node.markDirty();

    context.on('update', onUpdate);

    return () => context.off('update', onUpdate);
  }, []);

  const setLayout = useCallback((x: number, y: number, width: number, height: number) => {
    const view = viewRef.current;
    view.boundsArea ||= new Rectangle();
    view.boundsArea.width = width;
    view.boundsArea.height = height;
    view.position.set(x, y);
    onLayout?.(x, y, width, height);
  }, [ onLayout ]);

  const measure = useCallback(() => {
    const { maxX, maxY } = viewRef.current.context.bounds;
    return { width: maxX, height: maxY };
  }, []);

  return (
    <LayoutNode ref={ layoutRef } style={ props.style } measure={ measure } onLayout={ setLayout }>
      <pixiGraphics { ...props } ref={ viewRef } />
    </LayoutNode>
  );

});

FlexGraphics.displayName = 'Graphics';

export default FlexGraphics;
