import {
  isComponentJsxElement,
  isFragmentJsxElement,
  isIntrinsicJsxElement,
  isValidElement,
  type ComponentJsxElement,
  type FragmentJsxElement,
  type IntrinsicJsxElement,
  type JSXChild,
  type JSXElement,
  type LazyJSXChild,
  type LazyJSXChildren,
} from '../jsx-runtime';
import {
  getChildContext,
  getRenderContext,
  withRenderContext,
  type RenderContext,
  type UnmountFn,
} from './render-context';
import { isThunk, resolveValue } from '../value';
import { immediate } from '../effect';
import type { AnyTElement } from 'src/renderer';

// note one: we treat values and thunks uniformly here - both are LazyJSXChild
// note two: we always render in an immediate, so that state changes re runs and update nodes
// todo fragment is not implemented

export function renderNodes(nodes: LazyJSXChildren): UnmountFn {
  console.log('renderNodes', { nodes });
  const ctx = getRenderContext();
  if (isThunk(nodes)) {
    let unmount: UnmountFn | undefined;
    const dispose = immediate(() => {
      withRenderContext(ctx, () => {
        console.log('renderNodes.thunk.withRenderContext', { nodes });
        unmount = renderNodes(nodes());
      });
    });
    return () => {
      console.log('renderNodes.thunk.cleanup', { nodes });
      dispose();
      if (unmount) {
        unmount();
      }
    };
  }
  if (Array.isArray(nodes)) {
    // todo
    // for each child, find old ctx.
    // if not exists render node and context and add to the new one
    // if exists, reuse context (update) and add to the new one and remove from old one
    // for remaining old contexts, unmount

    const childContexts: RenderContext[] = [];
    nodes.forEach((child, index) => {
      console.log('renderNodes.forEach', { index, child });
      const key = getChildKey(child, index);
      const childCtx = getChildContext(key);
      childCtx.parent = ctx.parent;
      childContexts.push(childCtx);
      withRenderContext(childCtx, () => {
        console.log('renderNodes.withRenderContext', { index, child });
        renderNodes(child);
      });
    });
    return () => {
      console.log('renderNodes.cleanup', { nodes });
      childContexts.forEach((childCtx) => {
        if (childCtx.unmount) {
          childCtx.unmount();
        }
      });
    };
  }

  return renderNode(nodes);
}

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
    // null, undefined, boolean - no rendering
    if (node === null || node === undefined || typeof node === 'boolean') {
      return () => {}; // no-op cleanup
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
  } else if (isFragmentJsxElement(el)) {
    return renderFragmentElement(el);
  } else {
    throw new Error(`Unknown element type: ${String(el.type)}`);
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

function renderFragmentElement(el: FragmentJsxElement): UnmountFn {
  console.log('renderFragmentElement', {});
  const ctx = getRenderContext();
  const unmountChildren = renderChildren(el.props.children, ctx.parent);
  return () => {
    console.log('renderFragmentElement.cleanup', {});
    unmountChildren();
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
  const ctx = getRenderContext();
  const newCtx: RenderContext = { renderer: ctx.renderer, parent };

  return withRenderContext(newCtx, () => {
    console.log('renderChildren.withRenderContext', { children });
    return renderNodes(children);
  });
}

function getChildKey(child: LazyJSXChild, index: number): string | number {
  if (isValidElement(child)) {
    const el = child as JSXElement;
    if (el.key !== undefined && el.key !== null) {
      return String(el.key);
    }
  }
  return index;
}

// we should update or remove old and add new one?
// text contents (string and numbers) are same
// boolean/null/undefined always are same (no render)
// if elements, compare type and key
export function isSameNode(old: JSXChild, next: JSXChild): boolean {
  const isOldText = typeof old === 'string' || typeof old === 'number';
  const isNextText = typeof next === 'string' || typeof next === 'number';
  if (isOldText === isNextText) {
    return true;
  }
  const isOldNoRender =
    old === null || old === undefined || typeof old === 'boolean';
  const isNextNoRender =
    next === null || next === undefined || typeof next === 'boolean';
  if (isOldNoRender && isNextNoRender) {
    return true;
  }
  if (isValidElement(old) && isValidElement(next)) {
    return old.type === next.type && old.key === next.key;
  }
  return false;
}
