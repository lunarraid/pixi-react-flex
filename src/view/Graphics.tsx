import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { extend, PixiReactElementProps } from '@pixi/react';
import { Graphics, Rectangle } from 'pixi.js';
import { LayoutNode, LayoutProps, NodeContext } from '../flex/Layout';
import LayoutView, { type LayoutTransformProps } from './LayoutView';

/** Graphics with the layout transform; drawn in its own coordinates, so it isn't sized. */
export class LayoutGraphics extends LayoutView(Graphics) {}

extend({ LayoutGraphics });

declare module '@pixi/react' {
  interface PixiElements {
    pixiLayoutGraphics: PixiReactElementProps<typeof LayoutGraphics>;
  }
}

export type GraphicsProps = PixiReactElementProps<typeof LayoutGraphics> & LayoutTransformProps & LayoutProps;

const FlexGraphics = forwardRef(function FlexGraphics (props: GraphicsProps, ref) {

  if (props.children) {
    throw new Error('Only containers allow children');
  }

  const layoutRef = useRef<NodeContext>(null!);
  const viewRef = useRef<LayoutGraphics>(null!);

  useImperativeHandle(ref, () => ({ view: viewRef.current, layout: layoutRef.current }), []);

  const { style, onLayout, measure: _measure, ...pixiProps } = props;

  useLayoutEffect(() => {
    const { context } = viewRef.current;

    const onUpdate = () => layoutRef.current.node.markDirty();

    context.on('update', onUpdate);

    return () => { context.off('update', onUpdate); };
  }, []);

  const setLayout = useCallback((x: number, y: number, width: number, height: number) => {
    const view = viewRef.current;
    view.boundsArea ||= new Rectangle();
    view.boundsArea.width = width;
    view.boundsArea.height = height;
    view.applyLayout(x, y, width, height);
    onLayout?.(x, y, width, height);
  }, [ onLayout ]);

  const measure = useCallback(() => {
    const { maxX, maxY } = viewRef.current.context.bounds;
    return { width: maxX, height: maxY };
  }, []);

  return (
    <LayoutNode ref={ layoutRef } style={ style } measure={ measure } onLayout={ setLayout }>
      <pixiLayoutGraphics { ...pixiProps } ref={ viewRef } />
    </LayoutNode>
  );

});

FlexGraphics.displayName = 'Graphics';

export default FlexGraphics;
