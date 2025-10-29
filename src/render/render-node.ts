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
import type { AnyTElement, AnyTNode } from '../renderer';
import { _log, _withIndent } from '../debug';
import { getCtxDebugName } from './debug-ctx';

// note one: we treat values and thunks uniformly here - both are LazyJSXChild
// note two: we always render in an immediate, so that state changes re runs and update nodes
// todo fragment is not implemented

// what nodes can be?
// text
// no-op (null, undefined, boolean)
// element (intrinsic, component, fragment)
// array of nodes
// thunk returning any of above
export function renderNodes(nodes: LazyJSXChildren): UnmountFn {
  _log('renderNodes', { nodes });
  const ctx = getRenderContext();
  if (isThunk(nodes)) {
    const dispose = immediate(() => {
      _log('renderNodes.immediate (thunk)', { nodes });
      const resolvedContent = nodes();
      _log('renderNodes.immediate.resolved', { resolvedContent });
      withRenderContext(ctx, () => {
        _log('renderNodes.immediate.withRenderContext', getCtxDebugName(ctx), {
          resolvedContent,
        });
        renderNodes(resolvedContent);
      });
    });
    return () => {
      _log('renderNodes.cleanup (thunk)', { nodes });
      dispose();
    };
  }

  if (Array.isArray(nodes)) {
    return () => {}; // todo implement array handling
  }

  return renderNode(nodes);
}

export function renderNode(node: LazyJSXChild): UnmountFn {
  const ctx = getRenderContext();
  _log('renderNode', getCtxDebugName(ctx), { node });
  // todo - if not thunk, can optimize by not using immediate
  const dispose = immediate(() => {
    _log('renderNode.immediate', getCtxDebugName(ctx), { node });
    withRenderContext(ctx, () => {
      _log('renderNode.withRenderContext', getCtxDebugName(ctx), { node });
      const resolvedContent = resolveValue(node);
      ctx.unmount = _renderNode(resolvedContent);
      ctx.lastJsxNode = resolvedContent;
    });
  });
  return () => {
    _log('renderNode.cleanup', { node });
    ctx.lastJsxNode = undefined;
    if (ctx.unmount) {
      ctx.unmount();
      ctx.unmount = undefined;
    }
    dispose();
  };
}

export function _renderNode(node: JSXChild): UnmountFn {
  _log('_renderNode', { node });
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
  _log('renderElement', { type: el.type });
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
  _log('renderIntrinsicElement', { type: el.type });
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
    _log('renderIntrinsicElement.cleanup', { type: el.type });
    unmountChildren();
    if (ctx.lastNode) {
      ctx.renderer.removeChild(ctx.parent, ctx.lastNode);
      ctx.lastNode = undefined;
    }
  };
}

function renderComponentElement(el: ComponentJsxElement): UnmountFn {
  _log('renderComponentElement', { type: el.type });
  const component = el.type;
  const props = el.props;
  let childUnmount: UnmountFn | undefined;
  const dispose = immediate(() => {
    _log('renderComponentElement.immediate', {
      component: component?.name,
      props,
    });
    const res = component(props);
    const childCtx = getChildContext('');
    withRenderContext(childCtx, () => {
      _log('renderComponentElement.withRenderContext', { res });
      childUnmount = renderNode(res);
    });
  });
  return () => {
    _log('renderComponentElement.cleanup', { type: el.type });
    if (childUnmount) {
      childUnmount();
      childUnmount = undefined;
    }
    dispose();
  };
}

function renderFragmentElement(el: FragmentJsxElement): UnmountFn {
  _log('renderFragmentElement', {});
  const ctx = getRenderContext();
  const unmountChildren = renderChildren(el.props.children, ctx.parent);
  return () => {
    _log('renderFragmentElement.cleanup', {});
    unmountChildren();
  };
}

export function renderTextNode(text: string): UnmountFn {
  _log('renderTextNode', { text });
  const ctx = getRenderContext();
  if (ctx.lastNode === undefined) {
    _log('  lastNode is undefined');
    ctx.lastNode = ctx.renderer.createTextNode(text);
    ctx.renderer.appendChild(ctx.parent, ctx.lastNode);
  } else {
    _log('  lastNode is defined');
    ctx.renderer.setTextContent(ctx.lastNode, text);
  }
  return () => {
    _log('renderTextNode.cleanup', { text });
    if (ctx.lastNode) {
      _log('  removing lastNode');
      ctx.renderer.removeChild(ctx.parent, ctx.lastNode);
      ctx.lastNode = undefined;
    }
  };
}

export function renderChildren(
  children: LazyJSXChildren,
  parent: AnyTElement,
): UnmountFn {
  _log('renderChildren', { children });

  const ctx = getChildContext('', parent);

  return withRenderContext(ctx, () => {
    _log('renderChildren.withRenderContext', { children });
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

export function updateElement(nextNode: JSXChild) {
  const ctx = getRenderContext();
  _log('updateElement', getCtxDebugName(ctx), {
    oldNode: ctx.lastJsxNode,
    nextNode,
  });
  // this functions called when ctx.lastJsxNode isSameNode to nextNode
  // this is function only is called for elements
  // so we can reuse the existing ctx.lastNode and just update its attributes, event listeners
  // children is not handled here - it is handled in renderNodes

  // todo: update attributes, event listeners
}
