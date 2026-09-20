import type { Container, ContainerChild } from 'pixi.js';
import type { NodeContext } from './Layout';

/*
 * React's order of views, for layout children that share one position among their parent's React children (a
 * Fragment's children, or several from one component), which the index they're given can't tell apart. It's read
 * from the pixi tree, where @pixi/react places views in React order: from a layout view's own record of it (pixi
 * sorts `children` by zIndex), or from `children` in a plain pixi container.
 */

const contexts = new WeakMap<Container, NodeContext>();
const childOrders = new WeakMap<Container, ContainerChild[]>();

/** Ties a layout node to the view it lays out. */
export function linkView (view: Container, context: NodeContext) {
  contexts.set(view, context);
}

export function unlinkView (view: Container) {
  contexts.delete(view);
}

/** Registers a layout view's record of its children in React order. */
export function setChildOrder (view: Container, order: ContainerChild[]) {
  childOrders.set(view, order);
}

/** Whether the view is a layout view (which lays out what's placed in it) rather than a plain pixi container. */
export function isLayoutView (view: Container) {
  return childOrders.has(view);
}

/** Called by a layout view when it places a child: its layout parent reorders its children. */
export function viewMoved (view: Container) {
  contexts.get(view)?.parent?.markNeedsReindex();
}

/**
 * A comparison of `parent`'s child views by React order: negative when `a` comes first, 0 when that isn't known (a
 * view not placed yet). Made for one sort, while the tree stands still: the order is looked up once, if it's needed.
 *
 * A layout node's children all have their views in its own: one in a plain pixi container is laid out on its own.
 */
export function createViewComparator (parent: Container | null) {
  let positions: Map<ContainerChild, number> | undefined;

  return function compareViews (a: Container | null, b: Container | null): number {
    if (!a || !b || !parent) {
      return 0;
    }

    if (!positions) {
      positions = new Map();
      (childOrders.get(parent) ?? parent.children).forEach((child, index) => positions!.set(child, index));
    }

    const positionA = positions.get(a);
    const positionB = positions.get(b);

    return positionA === undefined || positionB === undefined ? 0 : positionA - positionB;
  };
}
