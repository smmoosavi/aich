declare global {
  interface Window extends AichWindow {}
}

interface AichWindow {
  __aich__: Aich;
}

export interface Aich {}

export function getAich(): Aich {
  if (!window.__aich__) {
    window.__aich__ = {};
  }
  return window.__aich__;
}
