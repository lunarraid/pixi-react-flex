import { Suspense, type ReactNode } from 'react';
import { Application, Container as PixiContainer, type ContainerChild } from 'pixi.js';
import { extend } from '@pixi/react';
// @ts-expect-error @pixi/react's internals, aliased in vitest.config.ts
import { reconciler } from '@pixi/react/lib/core/reconciler.mjs';
// @ts-expect-error
import { prepareInstance } from '@pixi/react/lib/helpers/prepareInstance.mjs';
// @ts-expect-error
import { ContextProvider } from '@pixi/react/lib/components/Context.mjs';
import { ConcurrentRoot } from 'react-reconciler/constants.js';
import type { LayoutViewMembers } from '../src';

// Plain pixi containers, for children that aren't layout views.
extend({ Container: PixiContainer });

type PrerenderRunner = { prerender (): void };

/**
 * Renders through @pixi/react's own reconciler and host helpers onto a real pixi stage, without a renderer: the
 * application is never initialised, and only its `prerender` runner (which lays out the tree) is stood in for.
 */
export function createTestRoot () {
  const runners = new Set<PrerenderRunner>();
  const app = new Application();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (app as any).renderer = {
    runners: {
      prerender: {
        add: (runner: PrerenderRunner) => runners.add(runner),
        remove: (runner: PrerenderRunner) => runners.delete(runner)
      }
    }
  };

  const stage = prepareInstance(new PixiContainer());
  const errors: unknown[] = [];
  const onError = (error: unknown) => { errors.push(error); };
  const fiber = reconciler.createContainer(stage, ConcurrentRoot, null, false, null, '', onError, onError, onError, null);
  const appState = { app, isInitialised: true, isInitialising: false };

  return {
    stage: stage as PixiContainer,
    errors,

    /** Commits `element` and lets effects, microtasks and timers settle. */
    async render (element: ReactNode) {
      reconciler.updateContainer(
        <ContextProvider value={ appState }>
          <Suspense fallback={ null }>{ element }</Suspense>
        </ContextProvider>,
        fiber,
        null,
        null
      );
      await settle();
    },

    /** What happens at the start of a frame: layout (the prerender runner), then pixi's zIndex sort. */
    frame () {
      runners.forEach((runner) => runner.prerender());
      sortRecursive(stage);
    },

    async unmount () {
      reconciler.updateContainer(null, fiber, null, null);
      await settle();
    }
  };
}

export async function settle () {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

/** Waits for yoga to load: layout nodes suspend until it has. */
export async function until (condition: () => boolean) {
  for (let i = 0; i < 200 && !condition(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  if (!condition()) {
    throw new Error('Timed out');
  }

  // The views exist from the commit; effects (which lay out, and subscribe to frames) run after it.
  await settle();
}

function sortRecursive (container: ContainerChild) {
  if (container.sortableChildren) {
    container.sortChildren();
  }

  container.children.forEach(sortRecursive);
}

export function find (stage: PixiContainer, label: string) {
  const view = stage.getChildByLabel(label, true);

  if (!view) {
    throw new Error(`No view labelled ${ label }`);
  }

  return view;
}

/** The labels of `parent`'s children in draw order. */
export function drawOrder (parent: PixiContainer) {
  return parent.children.map((child) => child.label);
}

/** Where each view was laid out along its row. */
export function xs (stage: PixiContainer, labels: string[]) {
  return labels.map((label) => find(stage, label).x);
}

/** The box a layout view was laid out in. */
export function layoutBox (stage: PixiContainer, label: string) {
  return (find(stage, label) as unknown as LayoutViewMembers).layoutBox;
}
