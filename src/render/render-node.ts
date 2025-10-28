import {
  isComponentJsxElement,
  isIntrinsicJsxElement,
  isValidElement,
  type ComponentJsxElement,
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
import type { AnyTElement } from 'src/renderer';

export function renderNode(node: LazyJSXChild) {
  console.log('renderNode', { node });
  const ctx = getRenderContext();
  // todo - if not thunk, can optimize by not using immediate
  immediate(() => {
    console.log('renderNode.immediate', { node });
    withRenderContext(ctx, () => {
      console.log('renderNode.withRenderContext', { node });
      const resolvedContent = resolveValue(node);
      _renderNode(resolvedContent);
      ctx.lastJsxNode = resolvedContent;
    });
  });
}

export function _renderNode(node: JSXChild) {
  console.log('_renderNode', { node });
  if (isValidElement(node)) {
    renderElement(node as JSXElement);
  } else {
    if (typeof node === 'string' || typeof node === 'number') {
      renderTextNode(String(node));
    }
  }
}

function renderElement(el: JSXElement) {
  console.log('renderElement', { type: el.type });
  if (isIntrinsicJsxElement(el)) {
    renderIntrinsicElement(el);
  } else if (isComponentJsxElement(el)) {
    renderComponentElement(el);
  } else {
    throw new Error(`Unknown element type: ${el.type}`);
  }
}

function renderIntrinsicElement(el: IntrinsicJsxElement) {
  console.log('renderIntrinsicElement', { type: el.type });
  const ctx = getRenderContext();
  if (ctx.lastNode === undefined) {
    ctx.lastNode = ctx.renderer.createElement(el.type);
    ctx.renderer.appendChild(ctx.parent, ctx.lastNode);
    // todo - set attributes
    // todo - event listeners
  }
  renderChildren(el.props.children, ctx.lastNode as AnyTElement);
}

function renderComponentElement(el: ComponentJsxElement) {
  console.log('renderComponentElement', { type: el.type });
  const component = el.type;
  const props = el.props;
  immediate(() => {
    console.log('renderComponentElement.immediate', { component: component?.name, props });
    const res = component(props);
    const childCtx = getChildContext('');
    withRenderContext(childCtx, () => {
      console.log('renderComponentElement.withRenderContext', { res });
      renderNode(res);
    });
  });
}

export function renderTextNode(text: string) {
  console.log('renderTextNode', { text });
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
  console.log('renderChildren', { children });
  (Array.isArray(children) ? children : [children]).forEach((child, index) => {
    console.log('renderChildren.forEach', { index, child });
    const childCtx = getChildContext(String(index));
    childCtx.parent = parent;
    withRenderContext(childCtx, () => {
      console.log('renderChildren.withRenderContext', { index, child });
      renderNode(child);
    });
  });
}
