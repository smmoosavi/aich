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
    let unmount: UnmountFn | undefined;
    const dispose = immediate(() => {
      withRenderContext(ctx, () => {
        _log('renderNodes.thunk.withRenderContext', { nodes });
        unmount = renderNodes(nodes());
      });
    });
    return () => {
      _log('renderNodes.thunk.cleanup', { nodes });
      dispose();
      if (unmount) {
        unmount();
      }
    };
  }
  if (Array.isArray(nodes)) {
    // Solid-style reconciliation algorithm for efficient list updates
    // Optimized for common cases: prefix/suffix matching, minimal DOM operations
    // Based on the algorithm from Solid.js array.ts

    const oldChildrenCtxs = ctx.childrenCtxs;
    const oldKeys: (string | number)[] = oldChildrenCtxs
      ? Array.from(oldChildrenCtxs.keys())
      : [];
    const newLen = nodes.length;
    const oldLen = oldKeys.length;

    ctx.childrenCtxs = new Map<string | number, RenderContext>();

    // Fast path: empty array
    if (newLen === 0) {
      if (oldLen !== 0) {
        // Unmount all old children
        oldChildrenCtxs?.forEach((oldChildCtx) => {
          if (oldChildCtx.unmount) {
            oldChildCtx.unmount();
          }
        });
      }
      return () => {
        _log('renderNodes.cleanup', { nodes });
      };
    }

    // Fast path: first render (no old children)
    if (oldLen === 0) {
      const childContexts: RenderContext[] = [];
      nodes.forEach((child, index) => {
        _log('renderNodes.forEach', { index, child });
        const key = getChildKey(child, index);
        const childCtx = getChildContext(key);
        childCtx.parent = ctx.parent;
        childContexts.push(childCtx);
        withRenderContext(childCtx, () => {
          _log('renderNodes.withRenderContext', { index, child });
          renderNodes(child);
        });
      });
      return () => {
        _log('renderNodes.cleanup', { nodes });
        childContexts.forEach((childCtx) => {
          if (childCtx.unmount) {
            childCtx.unmount();
          }
        });
      };
    }

    // General case: reconciliation with optimization
    const childContexts: RenderContext[] = new Array(newLen);
    const tempContexts: RenderContext[] = new Array(newLen);
    const tempNodes: AnyTNode[] = new Array(newLen);

    let start = 0;
    let end = oldLen - 1;
    let newEnd = newLen - 1;
    let key: string | number;
    let oldKey: string | number;

    // Step 1: Skip common prefix
    while (start <= end && start <= newEnd) {
      key = getChildKey(nodes[start], start);
      oldKey = oldKeys[start];
      if (key !== oldKey) break;

      const childCtx = oldChildrenCtxs!.get(oldKey)!;
      const child = nodes[start];
      if (!isSameNode(childCtx.lastJsxNode, child)) break;

      _log('renderNodes.reusePrefix', { index: start, key });
      ctx.childrenCtxs.set(key, childCtx);
      childContexts[start] = childCtx;
      childCtx.parent = ctx.parent;
      withRenderContext(childCtx, () => {
        renderNodes(child);
      });
      start++;
    }

    // Step 2: Skip common suffix
    while (start <= end && start <= newEnd) {
      key = getChildKey(nodes[newEnd], newEnd);
      oldKey = oldKeys[end];
      if (key !== oldKey) break;

      const childCtx = oldChildrenCtxs!.get(oldKey)!;
      const child = nodes[newEnd];
      if (!isSameNode(childCtx.lastJsxNode, child)) break;

      _log('renderNodes.reuseSuffix', { index: newEnd, key });
      ctx.childrenCtxs.set(key, childCtx);
      childContexts[newEnd] = childCtx;
      tempContexts[newEnd] = childCtx;
      tempNodes[newEnd] = childCtx.lastNode!;
      childCtx.parent = ctx.parent;
      withRenderContext(childCtx, () => {
        renderNodes(child);
      });
      end--;
      newEnd--;
    }

    // Save bounds after prefix/suffix matching for later positioning logic
    const middleStart = start;
    const middleEnd = newEnd;

    // Step 3: Simple cases - all items added or removed
    if (start > end) {
      // Only additions remain
      for (let j = start; j <= newEnd; j++) {
        const child = nodes[j];
        key = getChildKey(child, j);
        _log('renderNodes.add', { index: j, key });
        const childCtx = getChildContext(key);
        childCtx.parent = ctx.parent;
        childContexts[j] = childCtx;
        withRenderContext(childCtx, () => {
          renderNodes(child);
        });
      }
    } else if (start > newEnd) {
      // Only removals remain
      for (let i = start; i <= end; i++) {
        const oldKey = oldKeys[i];
        const oldChildCtx = oldChildrenCtxs!.get(oldKey);
        _log('renderNodes.remove', { index: i, key: oldKey });
        if (oldChildCtx?.unmount) {
          oldChildCtx.unmount();
        }
      }
    } else {
      // Step 4: Complex case - build map and reconcile
      const newIndices = new Map<string | number, number>();
      const newIndicesNext: number[] = new Array(newEnd + 1);

      // Build map of all indices in new items (scanning backwards)
      for (let j = newEnd; j >= start; j--) {
        key = getChildKey(nodes[j], j);
        const i = newIndices.get(key);
        newIndicesNext[j] = i === undefined ? -1 : i;
        newIndices.set(key, j);
      }

      // Match old items to new positions
      for (let i = start; i <= end; i++) {
        oldKey = oldKeys[i];
        const j = newIndices.get(oldKey);
        if (j !== undefined && j !== -1) {
          const childCtx = oldChildrenCtxs!.get(oldKey)!;
          const child = nodes[j];
          if (isSameNode(childCtx.lastJsxNode, child)) {
            _log('renderNodes.reuse', { oldIndex: i, newIndex: j, key: oldKey });
            tempContexts[j] = childCtx;
            tempNodes[j] = childCtx.lastNode!;
            const nextJ = newIndicesNext[j];
            newIndices.set(oldKey, nextJ);
          } else {
            // Type changed, need to unmount old and create new
            _log('renderNodes.replaceType', { index: j, key: oldKey });
            if (childCtx.unmount) {
              childCtx.unmount();
            }
          }
        } else {
          // Old item not in new list, unmount it
          const oldChildCtx = oldChildrenCtxs!.get(oldKey);
          _log('renderNodes.unmount', { index: i, key: oldKey });
          if (oldChildCtx?.unmount) {
            oldChildCtx.unmount();
          }
        }
      }

      // Create/update all items in the middle section
      for (let j = start; j <= newEnd; j++) {
        const child = nodes[j];
        key = getChildKey(child, j);
        if (j in tempContexts) {
          // Reused context
          const childCtx = tempContexts[j];
          ctx.childrenCtxs.set(key, childCtx);
          childContexts[j] = childCtx;
          childCtx.parent = ctx.parent;
          withRenderContext(childCtx, () => {
            renderNodes(child);
          });
        } else {
          // New context
          _log('renderNodes.create', { index: j, key });
          const childCtx = getChildContext(key);
          childCtx.parent = ctx.parent;
          childContexts[j] = childCtx;
          withRenderContext(childCtx, () => {
            renderNodes(child);
          });
        }
      }
    }

    // Step 5: Reorder DOM nodes - for both reused and newly created nodes
    // Process in reverse to maintain correct reference nodes
    for (let i = newLen - 1; i >= 0; i--) {
      const childCtx = childContexts[i];
      if (childCtx?.lastNode) {
        // Find the next sibling node to use as reference
        // For array contexts, we need to find the first actual DOM node
        let referenceNode: AnyTNode | null = null;
        for (let j = i + 1; j < newLen; j++) {
          const nextCtx = childContexts[j];
          if (nextCtx) {
            referenceNode = getFirstNode(nextCtx);
            if (referenceNode) break;
          }
        }
        
        // Insert/reorder the node if:
        // 1. It was reused and moved (tempNodes[i] exists), OR
        // 2. It's a newly created node in the middle section (between middleStart and middleEnd)
        if (tempNodes[i] || (i >= middleStart && i <= middleEnd)) {
          _log('renderNodes.positioning', { index: i, hasReference: !!referenceNode, middleStart, middleEnd });
          ctx.renderer.insertBefore(ctx.parent, childCtx.lastNode, referenceNode);
        }
      }
    }

    return () => {
      _log('renderNodes.cleanup', { nodes });
      childContexts.forEach((childCtx) => {
        if (childCtx?.unmount) {
          childCtx.unmount();
        }
      });
    };
  }

  return _withIndent(() => renderNode(nodes));
}

export function renderNode(node: LazyJSXChild): UnmountFn {
  const ctx = getRenderContext();
  _log('renderNode', getCtxDebugName(ctx), { node });
  // todo - if not thunk, can optimize by not using immediate
  const dispose = immediate(() => {
    _log('renderNode.immediate', { node });
    withRenderContext(ctx, () => {
      _log('renderNode.withRenderContext', { node });
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
