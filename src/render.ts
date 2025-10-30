import type { LazyJSXChild } from 'aich/jsx-runtime';
import type { AnyTElement, Renderer, RendererElement } from './renderer';

import type { AnyRenderer } from './renderer';
import {
  createCtx,
  withRenderContext,
  type RenderContext,
} from './render/render-context';
import { renderNode } from './render/render-node';
import { resetDebugCtx } from './render/debug-ctx';

export function render<R extends Renderer<any, any, any, any>>(
  renderer: R,
  container: RendererElement<R>,
  content: LazyJSXChild,
) {
  return _render(renderer, container, content);
}

export let rootCtx: RenderContext | null = null;

function _render(
  renderer: AnyRenderer,
  container: AnyTElement,
  content: LazyJSXChild,
) {
  resetDebugCtx();
  console.log('----- render -----', { container, content });
  const ctx: RenderContext = createCtx('', renderer, container);
  rootCtx = ctx;
  return withRenderContext(ctx, () => {
    return renderNode(content);
  });
}
