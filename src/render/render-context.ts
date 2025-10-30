import type { JSXChild } from 'aich/jsx-runtime';
import type { AnyRenderer, AnyTElement, AnyTNode } from 'src/renderer';
import { getRoot } from '../root';
import { _log, getCtxDebugName } from './debug-ctx';

/** @internal */
declare module '../root' {
  interface Root {
    currentRenderContext?: RenderContext;
  }
}

export type UnmountFn = () => void;

export interface RenderContext {
  key: string;
  renderer: AnyRenderer;
  parent: AnyTElement;
  lastJsxNode?: JSXChild;
  lastNode?: AnyTNode;
  childContexts: ChildContexts;
  unmount?: UnmountFn;
}

export function getRenderContext(): RenderContext {
  const root = getRoot();
  if (!root.currentRenderContext) {
    throw new Error('No render context available');
  }
  return root.currentRenderContext;
}

export function withRenderContext<T>(context: RenderContext, fn: () => T): T {
  const root = getRoot();
  const prevContext = root.currentRenderContext;
  root.currentRenderContext = context;
  try {
    return fn();
  } finally {
    root.currentRenderContext = prevContext;
  }
}

export function getChildContext(
  key: string,
  parent?: AnyTElement,
): RenderContext {
  const ctx = getRenderContext();
  if (!ctx.childContexts.byKey.has(key)) {
    _log('++Creating new child context for key:', key);
    addCtxToChildContexts(
      ctx.childContexts,
      createCtx(key, ctx.renderer, parent ?? ctx.parent),
    );
  } else {
    _log('Reusing existing child context for key:', key);
  }
  return ctx.childContexts.byKey.get(key)!;
}

export function createCtx(
  key: string,
  renderer: AnyRenderer,
  parent: AnyTElement,
): RenderContext {
  const ctx: RenderContext = {
    key,
    renderer,
    parent,
    childContexts: createChildContexts(),
  };
  _log('+++Created new render context:', getCtxDebugName(ctx));
  return ctx;
}

// --- children ctx ---
interface ChildContexts {
  byKey: Map<string, RenderContext>;
  byIndex: (RenderContext | null)[];
  indexMap: Map<RenderContext, number>;
}

export function createChildContexts(): ChildContexts {
  return {
    byKey: new Map<string, RenderContext>(),
    byIndex: [],
    indexMap: new Map<RenderContext, number>(),
  };
}

export function addCtxToChildContexts(
  childContexts: ChildContexts,
  ctx: RenderContext,
): void {
  childContexts.byKey.set(ctx.key, ctx);
  const index = childContexts.byIndex.length;
  childContexts.byIndex.push(ctx);
  childContexts.indexMap.set(ctx, index);
}

export function removeCtxFromChildContexts(
  childContexts: ChildContexts,
  ctx: RenderContext,
): void {
  const index = childContexts.indexMap.get(ctx);
  if (index === undefined) {
    return;
  }
  childContexts.byKey.delete(ctx.key);
  childContexts.indexMap.delete(ctx);
  childContexts.byIndex[index] = null;
}
