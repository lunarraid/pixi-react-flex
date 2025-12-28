import { Children, createContext, forwardRef, lazy, useContext, useEffect, useLayoutEffect, useImperativeHandle, useRef, type ReactNode, useMemo } from 'react';
import { loadYoga, MeasureFunction, Node } from 'yoga-layout/load';
import applyLayoutProperties, { Style, useShallowMemo } from './applyLayoutProperties';
import { useApplication } from '@pixi/react';

let LAYOUT_ID = 0;
let Yoga = null;

export const LayoutIndexContext = createContext(null);
export const LayoutNodeContext = createContext(null);

export type OnLayoutFunction = (x: number, y: number, width: number, height: number) => void;

export type NodeContext = {
  childMap: Record<string, NodeContext>,
  node: Node,
  needsReindex: boolean,
  cachedLayout: { top: number, left: number, width: number, height: number },
  index: number,
  style: Style | null,
  onLayout: OnLayoutFunction | null,
  measure: MeasureFunction | null,
  registerChildContext: (key: string, childContext: NodeContext) => NodeContext,
  unregisterChildContext: (key: string) => void,
  applyLayoutProperties: (style: Style) => void
};

function createNodeContext (): NodeContext  {

  const context = {

    childMap: {},
    node: Yoga.Node.create(),
    needsReindex: false,
    cachedLayout: { top: 0, left: 0, width: -1, height: -1 },
    index: -1,
    style: null,
    onLayout: null,
    measure: null,

    registerChildContext (key: string, childContext: NodeContext) {

      if (context.childMap[key]) {
        throw new Error(`Child with key "${ key }" already registered`);
      }

      context.childMap[key] = childContext;

      return context;
    },

    unregisterChildContext (key: string) {
      const { node } = context.childMap[key];
      const parent = node.getParent();
      parent?.removeChild(node);
      delete context.childMap[key];
      context.needsReindex = true;
    },

    applyLayoutProperties (style: Style): boolean {
      return applyLayoutProperties(context.node, context.style, style, context.style);
    }

  };

  return context;

}

export function LayoutChildren ({ children }) {
  return Children.map(children, (child, index) => child ? (
    <LayoutIndexContext.Provider value={ index }>
      { child }
    </LayoutIndexContext.Provider>
  ) : child);
}

export type LayoutProps = {
  measure?: MeasureFunction,
  onLayout?: OnLayoutFunction,
  style?: Style,
  children?: ReactNode
};

const LayoutNodeInternal = forwardRef(function LayoutNodeInternal (props: LayoutProps, ref) {

  const { measure = null, onLayout = null, style } = props;

  const index = useContext(LayoutIndexContext);
  const parent = useContext(LayoutNodeContext);

  let nodeContext = useRef(null);

  nodeContext.current ||= createNodeContext();
  nodeContext.current.onLayout = onLayout;

  useImperativeHandle(ref, () => nodeContext.current, []);

  if (nodeContext.current.measure !== measure) {

    measure
      ? nodeContext.current.node.setMeasureFunc(measure)
      : nodeContext.current.node.unsetMeasureFunc();

    nodeContext.current.measure = measure;

  }

  const memoStyle = useShallowMemo(style) as Style;

  const keyRef = useRef(null);

  if (!keyRef.current) {
    keyRef.current = `Layout${ LAYOUT_ID++ }`;
  }

  useLayoutEffect(() => {

    const key = keyRef.current;
    parent?.registerChildContext(key, nodeContext.current);

    return () => {
      parent?.unregisterChildContext(key);
    };

  }, [ parent ]);

  useLayoutEffect(() => {
    const c = nodeContext.current;
    c.index = index;

    applyLayoutProperties(c.node, c.style, memoStyle);
    c.style = memoStyle;

    if (parent) {
      parent.needsReindex = true;
    }

  }, [ parent, index, memoStyle ]);

  // Reorder any changed indexes

  useEffect(() => {

    const { childMap, node, needsReindex } = nodeContext.current;

    if (needsReindex) {
      const childCount = node.getChildCount();

      Object.keys(childMap)
        .sort((a, b) => childMap[a].index - childMap[b].index)
        .forEach((key, index) => {
          const child = childMap[key].node;

          if (index >= childCount || !node.getChild(index).isAliasOf(child)) {
            child.getParent()?.removeChild(child);
            node.insertChild(child, index);
          }

        });

      nodeContext.current.needsReindex = false;
    }

    if (!parent && node.isDirty()) {
      node.calculateLayout();
      notifyOnLayoutRecursive(nodeContext.current);
    }

  });

  useEffect(() => {

    const { node } = nodeContext.current;

    return () => {
      node.free();
    };

  }, []);

  const { app, isInitialised } = useApplication();

  useEffect(() => {

    if (!isInitialised) {
      return;
    }

    const needsListener = !parent;

    const runner = {
      prerender () {
        const { node } = nodeContext.current;

        if (node.isDirty()) {
          node.calculateLayout();
          notifyOnLayoutRecursive(nodeContext.current);
        }
      }
    };

    if (needsListener) {
      app.renderer.runners.prerender.add(runner);
    }

    return () => {
      needsListener && app.renderer.runners.prerender.remove(runner);
    };

  }, [ app, isInitialised, parent ]);

  return (
    <LayoutNodeContext.Provider value={ nodeContext.current }>
      <LayoutChildren>
        { props.children }
      </LayoutChildren>
    </LayoutNodeContext.Provider>
  );

});

function notifyOnLayout (context: NodeContext) {

  const { cachedLayout, node, onLayout } = context;
  const hasNewLayout = node.hasNewLayout();

  if (hasNewLayout) {

    node.markLayoutSeen();
    const newLayout = node.getComputedLayout();

    const { left: l1, top: t1, width: w1, height: h1 } = cachedLayout;
    const { left: l2, top: t2, width: w2, height: h2 } = newLayout;

    if (l1 !== l2 || t1 !== t2 || w1 !== w2 || h1 !== h2) {
      cachedLayout.left = l2;
      cachedLayout.top = t2;
      cachedLayout.width = w2;
      cachedLayout.height = h2;
      onLayout?.(l2, t2, w2, h2);
    }
  }

  return hasNewLayout;

}

function notifyOnLayoutRecursive (context: NodeContext) {

  const hasNewLayout = notifyOnLayout(context);

  if (!hasNewLayout) {
    return;
  }

  const { childMap } = context;

  for (const key in childMap) {
    notifyOnLayoutRecursive(childMap[key]);
  }
}

const loadPromise = loadYoga().then((yoga) => {
  Yoga = yoga;
  return { default: LayoutNodeInternal };
});

export const LayoutNode = lazy(() => loadPromise);
