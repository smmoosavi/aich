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
  type UnmountFn,
} from './render-context';
import { resolveValue } from '../value';
import { immediate } from '../effect';
import type { AnyTElement } from 'src/renderer';

export function renderNode(node: LazyJSXChild): UnmountFn {
  console.log('renderNode', { node });
  const ctx = getRenderContext();
  // todo - if not thunk, can optimize by not using immediate
  const dispose = immediate(() => {
    console.log('renderNode.immediate', { node });
    withRenderContext(ctx, () => {
      console.log('renderNode.withRenderContext', { node });
      const resolvedContent = resolveValue(node);
      ctx.unmount = _renderNode(resolvedContent);
      ctx.lastJsxNode = resolvedContent;
    });
  });
  return () => {
    console.log('renderNode.cleanup', { node });
    ctx.lastJsxNode = undefined;
    if (ctx.unmount) {
      ctx.unmount();
      ctx.unmount = undefined;
    }
    dispose();
  };
}

export function _renderNode(node: JSXChild): UnmountFn {
  console.log('_renderNode', { node });
  if (isValidElement(node)) {
    return renderElement(node as JSXElement);
  } else {
    if (typeof node === 'string' || typeof node === 'number') {
      return renderTextNode(String(node));
    }
  }
  return () => {
    throw new Error(`Unsupported JSX child type: ${typeof node}`);
  };
}

function renderElement(el: JSXElement): UnmountFn {
  console.log('renderElement', { type: el.type });
  if (isIntrinsicJsxElement(el)) {
    return renderIntrinsicElement(el);
  } else if (isComponentJsxElement(el)) {
    return renderComponentElement(el);
  } else {
    throw new Error(`Unknown element type: ${el.type}`);
  }
}

function renderIntrinsicElement(el: IntrinsicJsxElement): UnmountFn {
  console.log('renderIntrinsicElement', { type: el.type });
  const ctx = getRenderContext();
  if (ctx.lastNode === undefined) {
    ctx.lastNode = ctx.renderer.createElement(el.type);
    ctx.renderer.appendChild(ctx.parent, ctx.lastNode);
    // todo - set attributes
    // todo - event listeners
  }
  const unmountChildren = renderChildren(
    el.props.children,
    ctx.lastNode as AnyTElement,
  );
  return () => {
    console.log('renderIntrinsicElement.cleanup', { type: el.type });
    unmountChildren();
    if (ctx.lastNode) {
      ctx.renderer.removeChild(ctx.parent, ctx.lastNode);
      ctx.lastNode = undefined;
    }
  };
}

function renderComponentElement(el: ComponentJsxElement): UnmountFn {
  console.log('renderComponentElement', { type: el.type });
  const component = el.type;
  const props = el.props;
  let childUnmount: UnmountFn | undefined;
  const dispose = immediate(() => {
    console.log('renderComponentElement.immediate', {
      component: component?.name,
      props,
    });
    const res = component(props);
    const childCtx = getChildContext('');
    withRenderContext(childCtx, () => {
      console.log('renderComponentElement.withRenderContext', { res });
      childUnmount = renderNode(res);
    });
  });
  return () => {
    console.log('renderComponentElement.cleanup', { type: el.type });
    if (childUnmount) {
      childUnmount();
      childUnmount = undefined;
    }
    dispose();
  };
}

export function renderTextNode(text: string): UnmountFn {
  console.log('renderTextNode', { text });
  const ctx = getRenderContext();
  if (ctx.lastNode === undefined) {
    ctx.lastNode = ctx.renderer.createTextNode(text);
    ctx.renderer.appendChild(ctx.parent, ctx.lastNode);
  } else {
    ctx.renderer.setTextContent(ctx.lastNode, text);
  }
  return () => {
    console.log('renderTextNode.cleanup', { text });
    if (ctx.lastNode) {
      ctx.renderer.removeChild(ctx.parent, ctx.lastNode);
      ctx.lastNode = undefined;
    }
  };
}

export function renderChildren(
  children: LazyJSXChild | LazyJSXChild[],
  parent: AnyTElement,
): UnmountFn {
  console.log('renderChildren', { children });
  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach((child, index) => {
    console.log('renderChildren.forEach', { index, child });
    const childCtx = getChildContext(String(index));
    childCtx.parent = parent;
    withRenderContext(childCtx, () => {
      console.log('renderChildren.withRenderContext', { index, child });
      renderNode(child);
    });
  });
  return () => {
    console.log('renderChildren.cleanup', { children });
    childArray.forEach((_, index) => {
      const childCtx = getChildContext(String(index));
      if (childCtx.unmount) {
        childCtx.unmount();
      }
    });
  };
}
