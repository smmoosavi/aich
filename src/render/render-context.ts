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
  childrenCtxs?: Map<string | number, RenderContext>;
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
  if (ctx.childrenCtxs === undefined) {
    _log('+Initializing childrenCtxs map');
    ctx.childrenCtxs = new Map<string | number, RenderContext>();
  }
  if (!ctx.childrenCtxs.has(key)) {
    _log('++Creating new child context for key:', key);
    ctx.childrenCtxs.set(key, createCtx(ctx.renderer, parent ?? ctx.parent));
  } else {
    _log('Reusing existing child context for key:', key);
  }
  return ctx.childrenCtxs.get(key)!;
}

export function createCtx(
  renderer: AnyRenderer,
  parent: AnyTElement,
): RenderContext {
  const ctx: RenderContext = { renderer, parent };
  _log('+++Created new render context:', getCtxDebugName(ctx));
  return ctx;
}
