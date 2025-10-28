import type { JSXChild } from 'aich/jsx-runtime';
import type { AnyRenderer, AnyTElement, AnyTNode } from 'src/renderer';
import { getRoot } from '../root';

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

export function getChildContext(key: string | number): RenderContext {
  const ctx = getRenderContext();
  if (ctx.childrenCtxs === undefined) {
    ctx.childrenCtxs = new Map<string | number, RenderContext>();
  }
  if (!ctx.childrenCtxs.has(key)) {
    ctx.childrenCtxs.set(key, {
      renderer: ctx.renderer,
      parent: ctx.parent,
    });
  }
  return ctx.childrenCtxs.get(key)!;
}
