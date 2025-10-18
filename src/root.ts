import { getAich } from './aich';

declare module './aich' {
  interface Aich {
    root?: Root;
  }
}

export interface Root {}

export function getRoot() {
  const aich = getAich();
  if (!aich.root) {
    aich.root = {};
  }
  return aich.root;
}
