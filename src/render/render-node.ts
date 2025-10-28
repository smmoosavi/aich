import {
  isCommentJsxElement,
  isIntrinsicJsxElement,
  isValidElement,
  type CommentJsxElement,
  type IntrinsicJsxElement,
  type JSXChild,
  type JSXElement,
  type LazyJSXChild,
} from '../jsx-runtime';
import {
  getChildContext,
  getRenderContext,
  withRenderContext,
} from './render-context';
import { resolveValue } from '../value';
import { immediate } from '../effect';
import type { AnyTElement, AnyTNode } from 'src/renderer';

export function renderNode(node: LazyJSXChild) {
  const ctx = getRenderContext();
  // todo - if not thunk, can optimize by not using immediate
  immediate(() => {
    withRenderContext(ctx, () => {
      const resolvedContent = resolveValue(node);
      _renderNode(resolvedContent);
      ctx.lastJsxNode = resolvedContent;
    });
  });
}

export function _renderNode(node: JSXChild) {
  if (isValidElement(node)) {
    renderElement(node as JSXElement);
  } else {
    if (typeof node === 'string' || typeof node === 'number') {
      renderTextNode(String(node));
    }
  }
}

function renderElement(el: JSXElement) {
  if (isIntrinsicJsxElement(el)) {
    renderIntrinsicElement(el);
  } else if (isCommentJsxElement(el)) {
    renderComponentElement(el);
  } else {
    throw new Error(`Unknown element type: ${el.type}`);
  }
}

function renderIntrinsicElement(el: IntrinsicJsxElement) {
  const ctx = getRenderContext();
  if (ctx.lastNode === undefined) {
    ctx.lastNode = ctx.renderer.createElement(el.type);
    ctx.renderer.appendChild(ctx.parent, ctx.lastNode);
    // todo - set attributes
    // todo - event listeners
  }
  renderChildren(el.props.children ?? [], ctx.lastNode as AnyTElement);
}

function renderComponentElement(el: CommentJsxElement) {
  const component = el.type;
  const props = el.props;
  immediate(() => {
    const res = component(props);
    const childCtx = getChildContext('');
    withRenderContext(childCtx, () => {
      renderNode(res);
    });
  });
}

export function renderTextNode(text: string) {
  const ctx = getRenderContext();
  if (ctx.lastNode === undefined) {
    ctx.lastNode = ctx.renderer.createTextNode(text);
    ctx.renderer.appendChild(ctx.parent, ctx.lastNode);
    return;
  }
  ctx.renderer.setTextContent(ctx.lastNode, text);
}

export function renderChildren(
  children: LazyJSXChild | LazyJSXChild[],
  parent: AnyTElement,
) {
  (Array.isArray(children) ? children : [children]).forEach((child, index) => {
    const childCtx = getChildContext(String(index));
    childCtx.parent = parent;
    withRenderContext(childCtx, () => {
      renderNode(child);
    });
  });
}
