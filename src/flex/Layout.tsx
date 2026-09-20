import { Children, createContext, forwardRef, lazy, useContext, useEffect, useLayoutEffect, useImperativeHandle, useRef, type ReactNode, type RefObject } from 'react';
import type { Container } from 'pixi.js';
import { Errata, loadYoga, type Config, type MeasureFunction, type Node } from 'yoga-layout/load';
import applyLayoutProperties, { mergeStyles, Style, useShallowMemo } from './applyLayoutProperties';
import { useApplication } from '@pixi/react';
import { createViewComparator, isLayoutView, linkView, unlinkView } from './viewOrder';

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

// An unstyled node per config, which a node's style is reset from (see `applyLayoutProperties`): its defaults depend
// on the config.
const pristineNodes = new WeakMap<Config, Node>();
let defaultPristineNode: Node | undefined;

function getPristineNode (config: Config | undefined): Node {
  if (!config) {
    return defaultPristineNode ||= Yoga.Node.create();
  }

  let node = pristineNodes.get(config);

  if (!node) {
    node = Yoga.Node.create(config);
    pristineNodes.set(config, node);
  }

  return node;
}

export type OnLayoutFunction = (x: number, y: number, width: number, height: number) => void;

export type NodeContext = {
  key: string,
  childMap: Record<string, NodeContext>,
  /** The node this one is laid out in: none for a root, or for a node laid out on its own (see `detachedRoots`). */
  parent: NodeContext | null,
  /** The view laid out by this node, once linked. */
  view: Container | null,
  config: Config | undefined,
  node: Node,
  needsReindex: boolean,
  isFreed: boolean,
  cachedLayout: { top: number, left: number, width: number, height: number },
  index: number,
  /** The view's style, as last applied by `setStyle`. */
  style: Style | null,
  /** Values set over `style`'s by `applyLayoutProperties` (an animation's), until the node is next given a style. */
  overrides: Style | null,
  /** What the node was last styled with: `style`, or with any `overrides`, the two merged. */
  applied: Style | null,
  onLayout: OnLayoutFunction | null,
  measure: MeasureFunction | null,
  registerChildContext: (key: string, childContext: NodeContext) => NodeContext,
  unregisterChildContext: (key: string) => void,
  markNeedsReindex: () => void,
  reindex: () => void,
  setStyle: (style: Style | null) => boolean,
  applyLayoutProperties: (overrides: Style | null) => boolean,
  revive: () => void
};

// Nodes whose children changed, reindexed together before the next layout pass. Children register and reorder from
// their own effects (and views as they're placed), which happen whether or not their parent re-renders (a child
// remounting under a parent that does not), so a parent can't rely on an effect of its own.
const pendingReindex = new Set<NodeContext>();

// Nodes laid out on their own though rendered under another: their views are in plain pixi containers, which aren't
// laid out, so neither is anything placed in them (see the registering effect). Laid out along with the roots.
const detachedRoots = new Set<NodeContext>();

function flushReindex () {
  pendingReindex.forEach((context) => context.reindex());
  pendingReindex.clear();
}

function createNodeContext (config: Config | undefined): NodeContext  {

  const context: NodeContext = {

    key: `Layout${ LAYOUT_ID++ }`,
    childMap: {},
    parent: null,
    view: null,
    config,
    node: Yoga.Node.create(config),
    needsReindex: false,
    isFreed: false,
    cachedLayout: { top: 0, left: 0, width: -1, height: -1 },
    index: -1,
    style: null,
    overrides: null,
    applied: null,
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

    markNeedsReindex () {
      if (!context.needsReindex) {
        context.needsReindex = true;
        pendingReindex.add(context);
      }
    },

    reindex () {
      if (!context.needsReindex || context.isFreed) {
        return;
      }

      const { childMap, node } = context;
      const childCount = node.getChildCount();
      const compareViews = createViewComparator(context.view);

      // Children in React order: by their index among their parent's React children, then, for children sharing one
      // (a Fragment's), by where their views were placed.
      Object.values(childMap)
        .sort((a, b) => a.index - b.index || compareViews(a.view, b.view))
        .forEach(({ node: child }, index) => {

          if (index >= childCount || !(node.getChild(index) as YogaNodeWithAlias).isAliasOf(child)) {
            child.getParent()?.removeChild(child);
            node.insertChild(child, index);
          }

        });

      context.needsReindex = false;
    },

    // What a render says is how the node is styled: values set over the last style go.
    setStyle (style: Style | null): boolean {
      return restyle(style, null);
    },

    // Sets values over `style`'s until the node is next given a style, in place of the last call's: a key dropped
    // since then reverts to `style`'s value, or yoga's default.
    applyLayoutProperties (overrides: Style | null): boolean {
      return restyle(context.style, overrides);
    },

    // A freed node gets a new yoga node in the same state: styled in full again, with any values set over its style
    // while it was freed, and its children, still registered, go back in on the next reindex.
    revive () {
      context.node = Yoga.Node.create(context.config);
      context.isFreed = false;
      context.applied = null;
      restyle(context.style, context.overrides);
      context.cachedLayout.width = -1;
      context.measure && context.node.setMeasureFunc(context.measure);
      context.needsReindex = false;
      context.markNeedsReindex();
    },

  };

  function restyle (style: Style | null, overrides: Style | null): boolean {
    context.style = style;
    context.overrides = overrides;

    // Freed while its effects are disconnected, when it can still be animated: it's styled when it's revived.
    if (context.isFreed) {
      return false;
    }

    const next = mergeStyles(style, overrides);
    const didChange = applyLayoutProperties(context.node, getPristineNode(context.config), context.applied, next);
    context.applied = next;

    return didChange;
  }

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
  /** Sizes a node without children. The node is measured again whenever this changes, so keep it stable. */
  measure?: MeasureFunction,
  onLayout?: OnLayoutFunction,
  style?: Style,
  children?: ReactNode
};

type LayoutNodeBaseProps = LayoutProps & {
  /**
   * The view the node lays out. Where it's placed tells where the node is: among siblings that share a React
   * position (see `viewOrder`), and whether it's in a plain pixi container (see the registering effect).
   */
  viewRef: RefObject<Container | null>
};

const NOT_GIVEN = Symbol('not given');

const LayoutNodeInternal = forwardRef(function LayoutNodeInternal (props: LayoutNodeBaseProps, ref) {

  const { measure = null, onLayout = null, style, viewRef } = props;

  const index = useContext(LayoutIndexContext);
  const parent = useContext(LayoutNodeContext);
  const configOptions = useContext(LayoutConfigContext);

  const nodeContext = useRef<NodeContext>(null!);
  const givenStyle = useRef<Style | undefined | typeof NOT_GIVEN>(NOT_GIVEN);

  nodeContext.current ||= createNodeContext(getConfig(configOptions));

  useImperativeHandle(ref, () => nodeContext.current, []);

  const memoStyle = useShallowMemo(style) as Style;

  // StrictMode (in development) and <Activity> disconnect a component's effects and run them again, and the node is
  // freed on the way out, by the effect below: it's revived here, before the effects after this register and style it.
  useLayoutEffect(() => {
    if (nodeContext.current.isFreed) {
      nodeContext.current.revive();
    }
  }, []);

  // In an effect rather than the render: the node is freed while its effects are disconnected, when it can still
  // render (hidden in an <Activity>), and a render may never commit.
  useLayoutEffect(() => {

    const context = nodeContext.current;

    context.onLayout = onLayout;

    // A new function measures anew. Only a node with a measure function can be marked dirty, so before one is unset.
    if (context.measure !== measure) {
      context.measure && context.node.markDirty();
      measure ? context.node.setMeasureFunc(measure) : context.node.unsetMeasureFunc();
      measure && context.node.markDirty();
      context.measure = measure;
    }

  }, [ measure, onLayout ]);

  useLayoutEffect(() => {

    const context = nodeContext.current;
    const view = viewRef.current;

    if (!view) {
      return;
    }

    context.view = view;
    linkView(view, context);

    return () => {
      unlinkView(view);
      context.view = null;
    };

  }, [ viewRef ]);

  // After the view is linked.
  useLayoutEffect(() => {

    const context = nodeContext.current;
    const viewParent = context.view?.parent;

    // A view in a plain pixi container isn't part of its layout parent's layout: it's a root of its own.
    if (parent && viewParent && !isLayoutView(viewParent)) {
      detachedRoots.add(context);
      return () => { detachedRoots.delete(context); };
    }

    context.parent = parent;
    parent?.registerChildContext(context.key, context);

    return () => {
      parent?.unregisterChildContext(context.key);
      context.parent = null;
    };

  }, [ parent ]);

  useLayoutEffect(() => {
    const c = nodeContext.current;
    c.index = index ?? -1;

    c.parent?.markNeedsReindex();

  }, [ parent, index ]);

  // Whenever a style is given, whether or not it's a different one: a render from above ends the overrides (an
  // animated value can become a static one, of the value last rendered), which one from the component's own state,
  // with the style it had, doesn't. It does nothing when there's nothing to do.
  useLayoutEffect(() => {
    // Not when the effect only runs again (the node revived, above, overrides and all).
    if (givenStyle.current !== style) {
      givenStyle.current = style;
      nodeContext.current.setStyle(memoStyle ?? null);
    }
  }, [ style, memoStyle ]);

  useEffect(() => {

    const context = nodeContext.current;

    return () => {
      context.isFreed = true;
      context.node.free();
    };

  }, []);

  return (
    <LayoutNodeContext.Provider value={ nodeContext.current }>
      <LayoutChildren>
        { props.children }
      </LayoutChildren>
      { parent ? null : <LayoutRoot context={ nodeContext.current } /> }
    </LayoutNodeContext.Provider>
  );

});

function calculateLayout (context: NodeContext) {
  flushReindex();
  layOutRoot(context);
  detachedRoots.forEach(layOutRoot);
}

function layOutRoot (context: NodeContext) {
  if (!context.isFreed && context.node.isDirty()) {
    context.node.calculateLayout(undefined, undefined);
    notifyOnLayoutRecursive(context);
  }
}

/**
 * Lays out the tree under a root node: after each of the root's renders, and before each frame for changes that
 * didn't re-render it. Rendered by root nodes only, so the rest of the tree has no per-render effect or application
 * subscription.
 */
function LayoutRoot ({ context }: { context: NodeContext }) {

  const { app, isInitialised } = useApplication();

  useEffect(() => {
    calculateLayout(context);
  });

  useEffect(() => {

    if (!isInitialised) {
      return;
    }

    const runner = {
      prerender () {
        calculateLayout(context);
      }
    };

    app.renderer.runners.prerender.add(runner);

    return () => {
      app.renderer.runners.prerender.remove(runner);
    };

  }, [ app, isInitialised, context ]);

  return null;

}

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

/** The layout node behind every view: the public `LayoutNode` is a view of its own (`view/LayoutNode`). */
export const LayoutNodeBase = lazy(() => loadPromise);
