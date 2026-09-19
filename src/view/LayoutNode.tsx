import { Container } from 'pixi.js';
import { extend, PixiReactElementProps } from '@pixi/react';
import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef, useState, type ForwardRefExoticComponent, type ReactNode, type Ref } from 'react';
import { LayoutNodeBase, LayoutNodeContext, LayoutProps, NodeContext } from '../flex/Layout';
import LayoutView, { type LayoutTransformProps } from './LayoutView';

/** Where a `LayoutNode` was laid out: `x` and `y` in its parent's space, as for `onLayout`. */
export type LayoutNodeLayout = { x: number, y: number, width: number, height: number };

export type LayoutNodeProps = Omit<PixiReactElementProps<typeof LayoutMarker>, 'ref' | 'children'> & LayoutTransformProps
  & Omit<LayoutProps, 'children'> & {
  /** Content drawn in the node's box (from 0, 0 to its width and height), rendered once it's laid out. */
  children?: (layout: LayoutNodeLayout) => ReactNode
};

export type LayoutNodeRef = { view: LayoutMarker, layout: NodeContext };

/**
 * A node that takes part in layout without a view of its own: its layout is reported to `onLayout`, and to `children`,
 * a function rendering custom content in its box. That content isn't laid out: layout components in it are roots of
 * their own.
 *
 * It's placed by an empty pixi container (`LayoutMarker`), which draws nothing: where React places it tells where the
 * node is among siblings that share a React position, and whether it's in a plain pixi container.
 */
const LayoutNode: ForwardRefExoticComponent<LayoutNodeProps & { ref?: Ref<LayoutNodeRef> }> = forwardRef<LayoutNodeRef, LayoutNodeProps>(function LayoutNode (props, ref) {

  const viewRef = useRef<LayoutMarker>(null!);
  const layoutRef = useRef<NodeContext>(null!);

  useImperativeHandle(ref, () => ({ view: viewRef.current, layout: layoutRef.current }), []);

  const { style, onLayout, measure, children, ...pixiProps } = props;

  if (children !== undefined && typeof children !== 'function') {
    throw new Error('LayoutNode children must be a function of its layout');
  }

  // Layout is kept whether or not there's content to render with it (layout calls back only when it changes), but
  // renders only content: without it, `onLayout` alone doesn't re-render.
  const hasContent = children !== undefined;
  const lastLayout = useRef<LayoutNodeLayout | null>(null);
  const [ layout, setLayout ] = useState<LayoutNodeLayout | null>(null);

  const handleLayout = useCallback((x: number, y: number, width: number, height: number) => {
    viewRef.current.applyLayout(x, y, width, height);
    lastLayout.current = { x, y, width, height };
    hasContent && setLayout(lastLayout.current);
    onLayout?.(x, y, width, height);
  }, [ onLayout, hasContent ]);

  // Content given after the node was laid out renders with the layout it already has.
  useLayoutEffect(() => {
    hasContent && setLayout(lastLayout.current);
  }, [ hasContent ]);

  return (
    <LayoutNodeBase viewRef={ viewRef } ref={ layoutRef } style={ style } measure={ measure } onLayout={ handleLayout }>
      <pixiLayoutMarker { ...pixiProps } ref={ viewRef }>
        { children && layout ? (
          <LayoutNodeContext.Provider value={ null }>
            { children(layout) }
          </LayoutNodeContext.Provider>
        ) : null }
      </pixiLayoutMarker>
    </LayoutNodeBase>
  );

});

LayoutNode.displayName = 'LayoutNode';

export default LayoutNode;

/** A `LayoutNode`'s view: placed at its box, drawing only what its `children` render. */
export class LayoutMarker extends LayoutView(Container) {}

extend({ LayoutMarker });

declare module '@pixi/react' {
  interface PixiElements {
    pixiLayoutMarker: PixiReactElementProps<typeof LayoutMarker>;
  }
}
