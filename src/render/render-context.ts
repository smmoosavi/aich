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
  renderer: AnyRenderer;
  parent: AnyTElement;
  lastJsxNode?: JSXChild;
  lastNode?: AnyTNode;
  childrenCtxs: ChildrenCtxs;
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
  key: string | number,
  parent?: AnyTElement,
): RenderContext {
  const ctx = getRenderContext();
  if (!ctx.childrenCtxs.byKey.has(key)) {
    _log('++Creating new child context for key:', key);
    addCtxToChildrenCtxs(key, ctx.childrenCtxs, createCtx(ctx.renderer, parent ?? ctx.parent));
  } else {
    _log('Reusing existing child context for key:', key);
  }
  return ctx.childrenCtxs.byKey.get(key)!;
}

export function createCtx(
  renderer: AnyRenderer,
  parent: AnyTElement,
): RenderContext {
  const ctx: RenderContext = {
    renderer,
    parent,
    childrenCtxs: createChildrenCtxs(),
  };
  _log('+++Created new render context:', getCtxDebugName(ctx));
  return ctx;
}

// --- children ctx ---
interface ChildrenCtxs {
  byKey: Map<string | number, RenderContext>;
  byIndex: (RenderContext | null)[];
  indexMap: Map<RenderContext, number>;
}

export function createChildrenCtxs(): ChildrenCtxs {
  return {
    byKey: new Map<string | number, RenderContext>(),
    byIndex: [],
    indexMap: new Map<RenderContext, number>(),
  };
}

export function addCtxToChildrenCtxs(
  key: string | number,
  childrenCtxs: ChildrenCtxs,
  ctx: RenderContext,
): void {
  childrenCtxs.byKey.set(key, ctx);
  const index = childrenCtxs.byIndex.length;
  childrenCtxs.byIndex.push(ctx);
  childrenCtxs.indexMap.set(ctx, index);
}

export  function removeCtxFromChildrenCtxs(
  key: string | number,
  childrenCtxs: ChildrenCtxs,
  ctx: RenderContext,
): void {
  const index = childrenCtxs.indexMap.get(ctx);
  if (index === undefined) {
    return;
  }
  childrenCtxs.byKey.delete(key);
  childrenCtxs.indexMap.delete(ctx);
  childrenCtxs.byIndex[index] = null;
}
