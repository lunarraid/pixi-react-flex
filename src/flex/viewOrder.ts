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

/** Compares two views by React order: negative when `a` comes first, 0 when that isn't known. */
export function compareViews (a: Container | null, b: Container | null): number {
  if (!a || !b) {
    return 0;
  }

  const pathA = ancestry(a);
  const pathB = ancestry(b);
  let i = 0;

  while (i < pathA.length && i < pathB.length && pathA[i] === pathB[i]) {
    i++;
  }

  if (i === 0 || i === pathA.length || i === pathB.length) {
    return 0;
  }

  const parent = pathA[i - 1];
  const order = childOrders.get(parent) ?? parent.children;
  return order.indexOf(pathA[i]) - order.indexOf(pathB[i]);
}

/** The view and its ancestors, root first. */
function ancestry (view: Container) {
  const path: Container[] = [];

  for (let node: Container | null = view; node; node = node.parent) {
    path.push(node);
  }

  return path.reverse();
}
