import type { LazyJSXChild } from 'aich/jsx-runtime';
import { render as _render } from './render';
import { DOMRenderer } from './dom-renderer';

export function render(container: HTMLElement, content: LazyJSXChild): void {
  _render(DOMRenderer, container, content);
}
