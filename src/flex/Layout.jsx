/* TEST COMMENT */

import { Children, createContext, forwardRef, lazy, useContext, useEffect, useLayoutEffect, useImperativeHandle, useRef } from 'react';
import { loadYoga } from 'yoga-layout/load';
import applyLayoutProperties from './applyLayoutProperties';
import { useApplication } from '@pixi/react';

let LAYOUT_ID = 0;
let Yoga = null;

export const LayoutIndexContext = createContext(null);
export const LayoutNodeContext = createContext(null);

function createNodeContext () {

  const context = {

    childMap: {},
    node: Yoga.Node.create(),
    needsReindex: false,
    cachedLayout: { top: 0, left: 0, width: -1, height: -1 },
    index: -1,
    style: null,
    onLayout: null,
    measure: null,

    registerChildContext (key, childContext) {

      if (context.childMap[key]) {
        throw new Error(`Child with key "${ key }" already registered`);
      }

      context.childMap[key] = childContext;

      return context;
    },

    unregisterChildContext (key) {
      const { node } = context.childMap[key];
      const parent = node.getParent();
      parent?.removeChild(node);
      delete context.childMap[key];
      context.needsReindex = true;
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

const LayoutNodeInternal = forwardRef(function LayoutNodeInternal (props, ref) {

  const { measure = null, onLayout, style } = props;

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

    applyLayoutProperties(c.node, c.style, style);
    c.style = style;

    if (parent) {
      parent.needsReindex = true;
    }

  }, [ parent, index, style ]);

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

function notifyOnLayout (context) {

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

function notifyOnLayoutRecursive (context) {

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
