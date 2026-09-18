import { Children, createContext, forwardRef, lazy, useContext, useEffect, useLayoutEffect, useImperativeHandle, useRef, type ReactNode } from 'react';
import { Errata, loadYoga, type Config, type MeasureFunction, type Node } from 'yoga-layout/load';
import applyLayoutProperties, { Style, useShallowMemo } from './applyLayoutProperties';
import { useApplication } from '@pixi/react';

type YogaNodeWithAlias = Node & { isAliasOf(other: Node): boolean };

let LAYOUT_ID = 0;
let Yoga: Awaited<ReturnType<typeof loadYoga>> = null!;

export const LayoutIndexContext = createContext<number | null>(null);
export const LayoutNodeContext = createContext<NodeContext | null>(null);

/** Yoga quirks to reproduce; see yoga's `Errata`. `classic` is the behaviour of Yoga 1.x (and typeflex). */
export type LayoutErrata = 'none' | 'classic' | 'all' | 'stretch-flex-basis'
  | 'absolute-positioning-incorrect' | 'absolute-percent-against-inner-size';

export type LayoutConfigOptions = {
  /** Defaults to `none`: spec-conformant layout. */
  errata?: LayoutErrata,
  /** Layout values are rounded to 1 / pointScaleFactor. Defaults to 1; 0 disables rounding. */
  pointScaleFactor?: number,
  /** Web defaults: row direction, shrinking flex items, stretched content. Defaults to false. */
  useWebDefaults?: boolean
};

/**
 * Yoga configuration for every layout node created below the provider. Nodes read it once, when they are created,
 * so provide it above the layout root and keep the options object stable.
 */
export const LayoutConfigContext = createContext<LayoutConfigOptions | null>(null);

const ERRATA: Record<LayoutErrata, Errata> = {
  'none': Errata.None,
  'classic': Errata.Classic,
  'all': Errata.All,
  'stretch-flex-basis': Errata.StretchFlexBasis,
  'absolute-positioning-incorrect': Errata.AbsolutePositioningIncorrect,
  'absolute-percent-against-inner-size': Errata.AbsolutePercentAgainstInnerSize
};

// Yoga configs are shared by the nodes that use them, so one is kept per options object for the page's lifetime.
const configs = new WeakMap<LayoutConfigOptions, Config>();

function getConfig (options: LayoutConfigOptions | null): Config | undefined {
  if (!options) {
    return undefined;
  }

  let config = configs.get(options);

  if (!config) {
    const { errata = 'none', pointScaleFactor = 1, useWebDefaults = false } = options;
    config = Yoga.Config.create();
    config.setErrata(ERRATA[errata]);
    config.setPointScaleFactor(pointScaleFactor);
    config.setUseWebDefaults(useWebDefaults);
    configs.set(options, config);
  }

  return config;
}

export type OnLayoutFunction = (x: number, y: number, width: number, height: number) => void;

export type NodeContext = {
  childMap: Record<string, NodeContext>,
  node: Node,
  needsReindex: boolean,
  isFreed: boolean,
  cachedLayout: { top: number, left: number, width: number, height: number },
  index: number,
  style: Style | null,
  onLayout: OnLayoutFunction | null,
  measure: MeasureFunction | null,
  registerChildContext: (key: string, childContext: NodeContext) => NodeContext,
  unregisterChildContext: (key: string) => void,
  markNeedsReindex: () => void,
  reindex: () => void,
  applyLayoutProperties: (style: Style) => void
};

function createNodeContext (config: Config | undefined): NodeContext  {

  const context: NodeContext = {

    childMap: {},
    node: Yoga.Node.create(config),
    needsReindex: false,
    isFreed: false,
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
      context.markNeedsReindex();
    },

    // Children register and reorder from their own effects, which run whether or not this node re-renders (a child
    // remounting under a parent that does not). The reindex is queued rather than left to this node's next effect so
    // such children still join the Yoga tree; the microtask batches every child change from one commit.
    markNeedsReindex () {
      if (!context.needsReindex) {
        context.needsReindex = true;
        queueMicrotask(context.reindex);
      }
    },

    reindex () {
      if (!context.needsReindex || context.isFreed) {
        return;
      }

      const { childMap, node } = context;
      const childCount = node.getChildCount();

      Object.keys(childMap)
        .sort((a, b) => childMap[a].index - childMap[b].index)
        .forEach((key, index) => {
          const child = childMap[key].node;

          if (index >= childCount || !(node.getChild(index) as YogaNodeWithAlias).isAliasOf(child)) {
            child.getParent()?.removeChild(child);
            node.insertChild(child, index);
          }

        });

      context.needsReindex = false;
    },

    applyLayoutProperties (style: Style): boolean {
      return applyLayoutProperties(context.node, context.style, style, context.style);
    }

  };

  return context;

}

export function LayoutChildren ({ children }: { children?: ReactNode }) {
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
  const configOptions = useContext(LayoutConfigContext);

  const nodeContext = useRef<NodeContext>(null!);

  nodeContext.current ||= createNodeContext(getConfig(configOptions));
  nodeContext.current.onLayout = onLayout;

  useImperativeHandle(ref, () => nodeContext.current, []);

  if (nodeContext.current.measure !== measure) {

    measure
      ? nodeContext.current.node.setMeasureFunc(measure)
      : nodeContext.current.node.unsetMeasureFunc();

    nodeContext.current.measure = measure;

  }

  const memoStyle = useShallowMemo(style) as Style;

  const keyRef = useRef<string | null>(null);

  if (!keyRef.current) {
    keyRef.current = `Layout${ LAYOUT_ID++ }`;
  }

  useLayoutEffect(() => {

    const key = keyRef.current!;
    parent?.registerChildContext(key, nodeContext.current);

    return () => {
      parent?.unregisterChildContext(key);
    };

  }, [ parent ]);

  useLayoutEffect(() => {
    const c = nodeContext.current;
    c.index = index ?? -1;

    applyLayoutProperties(c.node, c.style, memoStyle);
    c.style = memoStyle;

    parent?.markNeedsReindex();

  }, [ parent, index, memoStyle ]);

  // Reorder any changed indexes

  useEffect(() => {

    const { node } = nodeContext.current;

    nodeContext.current.reindex();

    if (!parent && node.isDirty()) {
      node.calculateLayout(undefined, undefined);
      notifyOnLayoutRecursive(nodeContext.current);
    }

  });

  useEffect(() => {

    const context = nodeContext.current;

    return () => {
      context.isFreed = true;
      context.node.free();
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
          node.calculateLayout(undefined, undefined);
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
