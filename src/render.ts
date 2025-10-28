import type { LazyJSXChild } from 'aich/jsx-runtime';
import type { AnyTElement, Renderer, RendererElement } from './renderer';

import type { AnyRenderer } from './renderer';
import { withRenderContext, type RenderContext } from './render/render-context';
import { renderNode } from './render/render-node';

export function render<R extends Renderer<any, any, any, any>>(
  renderer: R,
  container: RendererElement<R>,
  content: LazyJSXChild,
): void {
  _render(renderer, container, content);
}

function _render(
  renderer: AnyRenderer,
  container: AnyTElement,
  content: LazyJSXChild,
): void {
  console.log('----- render -----', { container, content });
  const ctx: RenderContext = { renderer, parent: container };
  withRenderContext(ctx, () => {
    renderNode(content);
  })
}
