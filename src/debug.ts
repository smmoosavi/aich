let ctx = {
  indent: 1,
};

export function _log(...args: any[]) {
  const indentStr = '*'.repeat(ctx.indent * 2 - 1);
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
