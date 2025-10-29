import { rootCtx } from '../render';
import type { RenderContext } from './render-context';

let ctx = {
  indent: 1,
  names: new WeakMap<any, string>(),
  ctxNameIndex: 1,
};

export function getCtxDebugName(obj: any): string {
  if (obj.name) {
    return obj.name;
  }
  let name = ctx.names.get(obj);
  if (!name) {
    name = `CTX#${ctx.ctxNameIndex++}`;
    ctx.names.set(obj, name);
  }
  return name;
}

export function resetDebugCtx() {
  ctx = {
    indent: 1,
    names: new WeakMap<any, string>(),
    ctxNameIndex: 1,
  };
}

export function _log(...args: any[]) {
  const indentStr = ' '.repeat(ctx.indent * 2 - 1);
  console.log(indentStr, ...args);
}

export function _withIndent<T>(fn: () => T): T {
  ctx.indent++;
  try {
    return fn();
  } finally {
    ctx.indent--;
  }
}

export function debugContext() {
  if (rootCtx) {
    console.log('=================== Debug Render Context ===================');
    _debugContext(rootCtx, 'ROOT');
    console.log('============================================================');
  } else {
    console.log('No root render context available for debugging.');
  }
}

export function _debugContext(rctx: RenderContext, key: string | number) {
  _log(`[${key}]`, getCtxDebugName(rctx), 'JSX:', rctx?.lastJsxNode);
  rctx.childrenCtxs?.forEach((childCtx, key) => {
    _withIndent(() => {
      _debugContext(childCtx, key);
    });
  });
}
